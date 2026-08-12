import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.constants';
import { Rol } from '../common/enums/rol.enum';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum';
import { HistorialService } from '../historial/historial.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { Notificacion } from '../notificaciones/interfaces/notificacion.interface';
import { SolicitudPermiso } from './interfaces/solicitud.interface';
import { SolicitudConRelaciones } from './permisos.service';
import {
  buscarTransicion,
  ContextoJerarquia,
  resolverDestino,
  TipoAccion,
} from './transiciones';
import { verificarAutoridad } from './autorizacion';
import { construirNotificacionesFlujo } from './notificaciones-flujo';
import { CuotaService } from './cuota.service';

interface UsuarioRow {
  id: string;
  nombre: string;
  apellido: string;
  jefe_id: string | null;
  jefe_escuela_id: string | null;
}

@Injectable()
export class FlujoAprobacionService {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly historialService: HistorialService,
    private readonly notificacionesService: NotificacionesService,
    private readonly cuotaService: CuotaService,
  ) {}

  /**
   * Ejecuta una transición de estado de forma ATÓMICA: dentro de una única
   * transacción valida, cambia el estado (resolviendo destinos dinámicos como
   * la regla de "misma persona"), registra el historial inmutable y crea las
   * notificaciones. El despacho (tiempo real/email) ocurre tras el commit.
   */
  async ejecutarAccion(
    actor: { id: string; rol: Rol },
    solicitudId: string,
    accion: TipoAccion,
    comentario: string | undefined,
    ip: string | null,
  ): Promise<SolicitudConRelaciones> {
    let notificacionesCreadas: Notificacion[] = [];

    await this.knex.transaction(async (trx) => {
      const solicitud = await trx<SolicitudPermiso>('solicitudes_permiso')
        .where('id', solicitudId)
        .forUpdate()
        .first();
      if (!solicitud) {
        throw new NotFoundException('La solicitud no existe.');
      }

      const def = buscarTransicion(accion, solicitud.estado);
      if (!def) {
        throw new BadRequestException(
          `No se puede ${accion} una solicitud en estado ${solicitud.estado}.`,
        );
      }

      const docente = await trx<UsuarioRow>('usuarios')
        .where('id', solicitud.docente_id)
        .first();
      if (!docente) {
        throw new NotFoundException('El docente de la solicitud no existe.');
      }

      verificarAutoridad(actor, def, solicitud.docente_id, docente);

      const comentarioLimpio = comentario?.trim();
      if (def.requiereComentario && !comentarioLimpio) {
        throw new BadRequestException(
          'Debes indicar un comentario para esta acción.',
        );
      }

      // Al ENVIAR, valida la cuota anual del tipo de permiso.
      if (accion === TipoAccion.ENVIAR) {
        await this.cuotaService.verificarCuota(trx, {
          docenteId: solicitud.docente_id,
          tipoPermisoId: solicitud.tipo_permiso_id,
          fechaInicio: solicitud.fecha_inicio,
          unidad: solicitud.unidad_tiempo,
          cantidad: Number(solicitud.cantidad_tiempo),
          excluirSolicitudId: solicitud.id,
        });
      }

      const ctx: ContextoJerarquia = {
        jefe_id: docente.jefe_id,
        jefe_escuela_id: docente.jefe_escuela_id,
      };
      const destino = resolverDestino(def, ctx);

      // (a) Cambio de estado.
      await trx('solicitudes_permiso')
        .where('id', solicitudId)
        .update({
          estado: destino,
          updated_at: trx.fn.now(),
          ...(accion === TipoAccion.ENVIAR
            ? { submitted_at: trx.fn.now() }
            : {}),
        });

      // (b) Historial inmutable (solo INSERT).
      await this.historialService.registrar(trx, {
        solicitud_id: solicitudId,
        usuario_id: actor.id,
        accion: def.etiqueta,
        estado_anterior: solicitud.estado,
        estado_nuevo: destino,
        comentario: comentarioLimpio ?? null,
        ip_address: ip,
      });

      // (c) Notificaciones según el estado destino. Solo consultamos los IDs
      // de Talento Humano cuando el destino lo requiere.
      const idsTH =
        destino === EstadoSolicitud.PENDIENTE_TALENTO_HUMANO
          ? await this.idsTalentoHumano(trx)
          : [];
      const notificaciones = construirNotificacionesFlujo(
        accion,
        destino,
        solicitud,
        docente,
        comentarioLimpio,
        idsTH,
      );
      notificacionesCreadas = await this.notificacionesService.crearVarias(
        trx,
        notificaciones,
      );
    });

    await this.notificacionesService.despachar(notificacionesCreadas);
    return this.obtenerEnriquecida(solicitudId);
  }

  // ---------------------------------------------------------------------------

  private async idsTalentoHumano(trx: Knex): Promise<string[]> {
    const filas = await trx('usuarios as u')
      .join('roles as r', 'u.rol_id', 'r.id')
      .where('r.nombre', Rol.TALENTO_HUMANO)
      .where('u.activo', true)
      .select('u.id');
    return filas.map((f: { id: string }) => f.id);
  }

  private async obtenerEnriquecida(
    id: string,
  ): Promise<SolicitudConRelaciones> {
    const solicitud = await this.knex<SolicitudConRelaciones>(
      'solicitudes_permiso as s',
    )
      .join('tipos_permiso as tp', 's.tipo_permiso_id', 'tp.id')
      .join('usuarios as d', 's.docente_id', 'd.id')
      .where('s.id', id)
      .select(
        's.*',
        this.knex.ref('tp.nombre').as('tipo_permiso_nombre'),
        this.knex.ref('d.nombre').as('docente_nombre'),
        this.knex.ref('d.apellido').as('docente_apellido'),
      )
      .first();
    if (!solicitud) {
      throw new NotFoundException('La solicitud no existe.');
    }
    return solicitud;
  }
}
