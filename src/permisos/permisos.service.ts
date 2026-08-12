import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.constants';
import { Rol } from '../common/enums/rol.enum';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum';
import { UnidadTiempo } from '../common/enums/unidad-tiempo.enum';
import { calcularDiasHabiles } from '../common/utils/dias-habiles.util';
import { UsuarioAutenticado } from '../auth/interfaces/jwt.interface';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ActualizarSolicitudDto } from './dto/actualizar-solicitud.dto';
import { SolicitudPermiso } from './interfaces/solicitud.interface';
import { CuotaService, InfoCuota } from './cuota.service';

/** Solicitud enriquecida con datos de las tablas relacionadas (para lectura). */
export interface SolicitudConRelaciones extends SolicitudPermiso {
  tipo_permiso_nombre: string;
  docente_nombre: string;
  docente_apellido: string;
}

interface FiltrosListado {
  estado?: EstadoSolicitud;
  tipo_permiso_id?: number;
}

@Injectable()
export class PermisosService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly cuotaService: CuotaService,
  ) {}

  /**
   * Crea una solicitud propia en estado BORRADOR. El `docente_id` SIEMPRE es
   * el del usuario autenticado. La `cantidad_tiempo` en DIAS se recalcula en el
   * backend (días hábiles); en HORAS se toma la cantidad indicada.
   */
  async crear(
    usuario: UsuarioAutenticado,
    dto: CrearSolicitudDto,
  ): Promise<SolicitudPermiso> {
    await this.validarTipoActivo(dto.tipo_permiso_id);
    this.validarRangoFechas(dto.fecha_inicio, dto.fecha_fin);
    await this.validarSustituto(usuario.id, dto.docente_sustituto_id);

    const cantidadTiempo = this.resolverCantidadTiempo(
      dto.unidad_tiempo,
      dto.fecha_inicio,
      dto.fecha_fin,
      dto.cantidad_tiempo,
    );

    // Horas: solo se guardan si la unidad es HORAS (en DIAS van como null).
    const esHoras = dto.unidad_tiempo === UnidadTiempo.HORAS;
    const horaInicio = esHoras ? (dto.hora_inicio ?? null) : null;
    const horaFin = esHoras ? (dto.hora_fin ?? null) : null;
    this.validarRangoHoras(horaInicio, horaFin);

    // Valida la cuota anual del tipo de permiso (si tiene límite).
    await this.cuotaService.verificarCuota(this.knex, {
      docenteId: usuario.id,
      tipoPermisoId: dto.tipo_permiso_id,
      fechaInicio: dto.fecha_inicio,
      unidad: dto.unidad_tiempo,
      cantidad: cantidadTiempo,
    });

    const [solicitud] = await this.knex<SolicitudPermiso>('solicitudes_permiso')
      .insert({
        docente_id: usuario.id,
        tipo_permiso_id: dto.tipo_permiso_id,
        estado: EstadoSolicitud.BORRADOR,
        fecha_inicio: dto.fecha_inicio,
        fecha_fin: dto.fecha_fin,
        unidad_tiempo: dto.unidad_tiempo,
        cantidad_tiempo: cantidadTiempo,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        motivo: dto.motivo ?? null,
        observaciones: dto.observaciones ?? null,
        docente_sustituto_id: dto.docente_sustituto_id ?? null,
        plan_trabajo_adjunto: dto.plan_trabajo_adjunto ?? null,
        documento_soporte: dto.documento_soporte ?? null,
      })
      .returning('*');
    return solicitud;
  }

  /** Lista solicitudes aplicando el aislamiento de datos según el rol. */
  async listar(
    usuario: UsuarioAutenticado,
    filtros: FiltrosListado = {},
  ): Promise<SolicitudConRelaciones[]> {
    const query = this.consultaBase();
    this.aplicarAislamiento(query, usuario);

    if (filtros.estado) {
      query.where('s.estado', filtros.estado);
    }
    if (filtros.tipo_permiso_id) {
      query.where('s.tipo_permiso_id', filtros.tipo_permiso_id);
    }

    return query.orderBy('s.created_at', 'desc');
  }

  /**
   * Resumen de conteos por estado dentro de la visibilidad del usuario
   * (mismo aislamiento que el listado). Útil para el dashboard.
   */
  async resumen(
    usuario: UsuarioAutenticado,
  ): Promise<{ total: number; porEstado: Record<EstadoSolicitud, number> }> {
    const query = this.knex('solicitudes_permiso as s');
    this.aplicarAislamiento(query, usuario);

    const filas = (await query
      .select('s.estado')
      .count('* as n')
      .groupBy('s.estado')) as { estado: EstadoSolicitud; n: string }[];

    const porEstado = Object.values(EstadoSolicitud).reduce(
      (acc, e) => ({ ...acc, [e]: 0 }),
      {} as Record<EstadoSolicitud, number>,
    );
    let total = 0;
    for (const f of filas) {
      const n = Number(f.n);
      porEstado[f.estado] = n;
      total += n;
    }
    return { total, porEstado };
  }

  /** Estado de la cuota anual del usuario para un tipo de permiso. */
  async cuota(
    usuario: UsuarioAutenticado,
    tipoPermisoId: number,
    anio: number,
  ): Promise<InfoCuota> {
    return this.cuotaService.obtenerCuota(usuario.id, tipoPermisoId, anio);
  }

  /** Obtiene una solicitud validando que el usuario tenga permiso de verla. */
  async obtener(
    usuario: UsuarioAutenticado,
    id: string,
  ): Promise<SolicitudConRelaciones> {
    const solicitud = await this.consultaBase().where('s.id', id).first();
    if (!solicitud) {
      throw new NotFoundException('La solicitud no existe.');
    }
    if (!(await this.puedeVer(usuario, solicitud))) {
      throw new ForbiddenException('No puedes ver esta solicitud.');
    }
    return solicitud;
  }

  /**
   * Actualiza una solicitud. Solo el dueño y solo en BORRADOR. Recalcula
   * `dias_habiles` si cambian las fechas.
   */
  async actualizar(
    usuario: UsuarioAutenticado,
    id: string,
    dto: ActualizarSolicitudDto,
  ): Promise<SolicitudPermiso> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No se enviaron campos para actualizar.');
    }

    const solicitud = await this.obtenerCrudo(id);
    this.verificarPropiedadYBorrador(usuario, solicitud);

    const fechaInicio = dto.fecha_inicio ?? solicitud.fecha_inicio;
    const fechaFin = dto.fecha_fin ?? solicitud.fecha_fin;
    if (dto.fecha_inicio || dto.fecha_fin) {
      this.validarRangoFechas(fechaInicio, fechaFin);
    }
    if (dto.tipo_permiso_id) {
      await this.validarTipoActivo(dto.tipo_permiso_id);
    }
    if (dto.docente_sustituto_id) {
      await this.validarSustituto(usuario.id, dto.docente_sustituto_id);
    }

    const cambios: Partial<SolicitudPermiso> = {
      ...(dto.tipo_permiso_id !== undefined
        ? { tipo_permiso_id: dto.tipo_permiso_id }
        : {}),
      ...(dto.fecha_inicio !== undefined
        ? { fecha_inicio: dto.fecha_inicio }
        : {}),
      ...(dto.fecha_fin !== undefined ? { fecha_fin: dto.fecha_fin } : {}),
      ...(dto.motivo !== undefined ? { motivo: dto.motivo } : {}),
      ...(dto.observaciones !== undefined
        ? { observaciones: dto.observaciones }
        : {}),
      ...(dto.docente_sustituto_id !== undefined
        ? { docente_sustituto_id: dto.docente_sustituto_id }
        : {}),
      ...(dto.plan_trabajo_adjunto !== undefined
        ? { plan_trabajo_adjunto: dto.plan_trabajo_adjunto }
        : {}),
      ...(dto.documento_soporte !== undefined
        ? { documento_soporte: dto.documento_soporte }
        : {}),
      ...(dto.unidad_tiempo !== undefined
        ? { unidad_tiempo: dto.unidad_tiempo }
        : {}),
      updated_at: this.knex.fn.now() as unknown as Date,
    };

    // Si cambia la unidad, las fechas o la cantidad, recalculamos el tiempo.
    const tiempoCambia =
      dto.unidad_tiempo !== undefined ||
      dto.fecha_inicio !== undefined ||
      dto.fecha_fin !== undefined ||
      dto.cantidad_tiempo !== undefined;
    if (tiempoCambia) {
      const unidadEfectiva = dto.unidad_tiempo ?? solicitud.unidad_tiempo;
      cambios.cantidad_tiempo = this.resolverCantidadTiempo(
        unidadEfectiva,
        fechaInicio,
        fechaFin,
        dto.cantidad_tiempo ?? solicitud.cantidad_tiempo,
      );
    }

    // Horas: si la unidad efectiva es HORAS se mantienen/actualizan; si pasa a
    // DIAS se limpian.
    if (
      dto.unidad_tiempo !== undefined ||
      dto.hora_inicio !== undefined ||
      dto.hora_fin !== undefined
    ) {
      const unidadEfectiva = dto.unidad_tiempo ?? solicitud.unidad_tiempo;
      if (unidadEfectiva === UnidadTiempo.HORAS) {
        const hi = dto.hora_inicio ?? solicitud.hora_inicio;
        const hf = dto.hora_fin ?? solicitud.hora_fin;
        this.validarRangoHoras(hi, hf);
        cambios.hora_inicio = hi;
        cambios.hora_fin = hf;
      } else {
        cambios.hora_inicio = null;
        cambios.hora_fin = null;
      }
    }

    const [actualizada] = await this.knex<SolicitudPermiso>(
      'solicitudes_permiso',
    )
      .where('id', id)
      .update(cambios)
      .returning('*');
    return actualizada;
  }

  /** Elimina una solicitud. Solo el dueño y solo en BORRADOR. */
  async eliminar(usuario: UsuarioAutenticado, id: string): Promise<void> {
    const solicitud = await this.obtenerCrudo(id);
    this.verificarPropiedadYBorrador(usuario, solicitud);
    await this.knex('solicitudes_permiso').where('id', id).del();
  }

  // ---------------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------------

  private consultaBase(): Knex.QueryBuilder<
    SolicitudConRelaciones,
    SolicitudConRelaciones[]
  > {
    return this.knex<SolicitudConRelaciones>('solicitudes_permiso as s')
      .join('tipos_permiso as tp', 's.tipo_permiso_id', 'tp.id')
      .join('usuarios as d', 's.docente_id', 'd.id')
      .select(
        's.*',
        this.knex.ref('tp.nombre').as('tipo_permiso_nombre'),
        this.knex.ref('d.nombre').as('docente_nombre'),
        this.knex.ref('d.apellido').as('docente_apellido'),
      ) as Knex.QueryBuilder<SolicitudConRelaciones, SolicitudConRelaciones[]>;
  }

  /**
   * Restringe el listado según el rol (aislamiento de datos). Talento Humano y
   * Admin ven todo; cualquier otro usuario ve sus propias solicitudes y las de
   * los docentes de los que es Jefe Inmediato o Jefe de Escuela.
   */
  private aplicarAislamiento(
    query: Knex.QueryBuilder,
    usuario: UsuarioAutenticado,
  ): void {
    if (usuario.rol === Rol.ADMIN || usuario.rol === Rol.TALENTO_HUMANO) {
      return; // acceso total
    }
    query.where((qb) => {
      qb.where('s.docente_id', usuario.id).orWhereIn(
        's.docente_id',
        this.knex('usuarios')
          .select('id')
          .where('jefe_id', usuario.id)
          .orWhere('jefe_escuela_id', usuario.id),
      );
    });
  }

  /** ¿El usuario puede VER esta solicitud concreta? */
  private async puedeVer(
    usuario: UsuarioAutenticado,
    solicitud: SolicitudPermiso,
  ): Promise<boolean> {
    if (usuario.rol === Rol.ADMIN || usuario.rol === Rol.TALENTO_HUMANO) {
      return true;
    }
    if (solicitud.docente_id === usuario.id) {
      return true;
    }
    return this.esJefeDelDocente(usuario.id, solicitud.docente_id);
  }

  /** ¿`usuarioId` es Jefe Inmediato o Jefe de Escuela del docente? */
  private async esJefeDelDocente(
    usuarioId: string,
    docenteId: string,
  ): Promise<boolean> {
    const docente = await this.knex('usuarios')
      .select('jefe_id', 'jefe_escuela_id')
      .where('id', docenteId)
      .first();
    return (
      !!docente &&
      (docente.jefe_id === usuarioId || docente.jefe_escuela_id === usuarioId)
    );
  }

  private async obtenerCrudo(id: string): Promise<SolicitudPermiso> {
    const solicitud = await this.knex<SolicitudPermiso>('solicitudes_permiso')
      .where('id', id)
      .first();
    if (!solicitud) {
      throw new NotFoundException('La solicitud no existe.');
    }
    return solicitud;
  }

  /**
   * Reglas para editar/borrar: debe ser el dueño y estar en BORRADOR.
   * El aislamiento de propiedad se valida SIEMPRE en el servicio (no solo
   * en el guard), tal como exige el CLAUDE.md.
   */
  private verificarPropiedadYBorrador(
    usuario: UsuarioAutenticado,
    solicitud: SolicitudPermiso,
  ): void {
    if (solicitud.docente_id !== usuario.id) {
      throw new ForbiddenException('Solo puedes modificar tus solicitudes.');
    }
    if (solicitud.estado !== EstadoSolicitud.BORRADOR) {
      throw new BadRequestException(
        'Solo se pueden modificar solicitudes en estado BORRADOR.',
      );
    }
  }

  private async validarTipoActivo(tipoPermisoId: number): Promise<void> {
    const tipo = await this.knex('tipos_permiso')
      .where('id', tipoPermisoId)
      .first();
    if (!tipo) {
      throw new BadRequestException('El tipo de permiso no existe.');
    }
    if (!tipo.activo) {
      throw new BadRequestException('El tipo de permiso no está activo.');
    }
  }

  /**
   * Calcula la cantidad de tiempo a guardar:
   * - DIAS: días hábiles entre las fechas (recalculado en el backend).
   * - HORAS: la cantidad indicada (debe ser > 0).
   */
  private resolverCantidadTiempo(
    unidad: UnidadTiempo,
    fechaInicio: string,
    fechaFin: string,
    cantidad?: number,
  ): number {
    if (unidad === UnidadTiempo.DIAS) {
      return calcularDiasHabiles(fechaInicio, fechaFin);
    }
    if (cantidad === undefined || cantidad === null || Number(cantidad) <= 0) {
      throw new BadRequestException(
        'Debes indicar la cantidad de horas (mayor que 0).',
      );
    }
    return Number(cantidad);
  }

  private validarRangoFechas(fechaInicio: string, fechaFin: string): void {
    if (fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin no puede ser anterior a la de inicio.',
      );
    }
  }

  /** Si hay ambas horas, la de fin debe ser posterior a la de inicio. */
  private validarRangoHoras(
    horaInicio: string | null,
    horaFin: string | null,
  ): void {
    if (horaInicio && horaFin && horaFin <= horaInicio) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la de inicio.',
      );
    }
  }

  private async validarSustituto(
    docenteId: string,
    sustitutoId?: string,
  ): Promise<void> {
    if (!sustitutoId) {
      return;
    }
    if (sustitutoId === docenteId) {
      throw new BadRequestException(
        'El docente sustituto no puede ser el mismo solicitante.',
      );
    }
    const sustituto = await this.knex('usuarios')
      .where('id', sustitutoId)
      .first();
    if (!sustituto) {
      throw new BadRequestException('El docente sustituto no existe.');
    }
  }
}
