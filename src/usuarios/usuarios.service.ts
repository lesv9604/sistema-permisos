import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import * as bcrypt from 'bcryptjs';
import { KNEX_CONNECTION } from '../database/database.constants';
import { Rol } from '../common/enums/rol.enum';
import {
  UsuarioConRol,
  UsuarioPublico,
} from './interfaces/usuario.interface';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import {
  ContextoCarga,
  parsearCsvUsuarios,
  prepararUsuarios,
} from './carga-masiva';

interface FiltrosUsuarios {
  rol?: Rol;
  activo?: boolean;
}

@Injectable()
export class UsuariosService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  /**
   * Selección base de un usuario con el nombre de su rol resuelto.
   */
  private consultaConRol(): Knex.QueryBuilder<UsuarioConRol> {
    return this.knex<UsuarioConRol>('usuarios')
      .join('roles', 'usuarios.rol_id', 'roles.id')
      .select(
        'usuarios.*',
        this.knex.ref('roles.nombre').as('rol'),
      );
  }

  async buscarPorEmail(email: string): Promise<UsuarioConRol | undefined> {
    return this.consultaConRol()
      .where('usuarios.email', email.toLowerCase().trim())
      .first();
  }

  async buscarPorId(id: string): Promise<UsuarioConRol | undefined> {
    return this.consultaConRol().where('usuarios.id', id).first();
  }

  /**
   * Guarda el hash del refresh token (o lo limpia con `null` al cerrar sesión).
   */
  async actualizarRefreshTokenHash(
    id: string,
    hash: string | null,
  ): Promise<void> {
    await this.knex('usuarios')
      .where('id', id)
      .update({ refresh_token_hash: hash, updated_at: this.knex.fn.now() });
  }

  /**
   * Convierte un usuario interno en su forma pública (sin datos sensibles).
   */
  aPublico(usuario: UsuarioConRol): UsuarioPublico {
    return {
      id: usuario.id,
      rol: usuario.rol,
      jefe_id: usuario.jefe_id,
      jefe_escuela_id: usuario.jefe_escuela_id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      cedula: usuario.cedula,
      escuela: usuario.escuela,
      dependencia: usuario.dependencia,
      cargo: usuario.cargo,
      activo: usuario.activo,
    };
  }

  // ---------------------------------------------------------------------------
  // CRUD (solo ADMIN, gestionado en el controlador)
  // ---------------------------------------------------------------------------

  /** Lista usuarios con filtros opcionales por rol y estado. */
  async listar(filtros: FiltrosUsuarios = {}): Promise<UsuarioPublico[]> {
    const query = this.consultaConRol();
    if (filtros.rol) {
      query.where('roles.nombre', filtros.rol);
    }
    if (filtros.activo !== undefined) {
      query.where('usuarios.activo', filtros.activo);
    }
    const filas: UsuarioConRol[] = await query.orderBy([
      { column: 'usuarios.apellido' },
      { column: 'usuarios.nombre' },
    ]);
    return filas.map((u: UsuarioConRol) => this.aPublico(u));
  }

  async obtenerPublico(id: string): Promise<UsuarioPublico> {
    const usuario = await this.buscarPorId(id);
    if (!usuario) {
      throw new NotFoundException('El usuario no existe.');
    }
    return this.aPublico(usuario);
  }

  async crear(dto: CrearUsuarioDto): Promise<UsuarioPublico> {
    const email = dto.email.toLowerCase().trim();
    await this.verificarEmailUnico(email);
    await this.verificarCedulaUnica(dto.cedula);
    const rolId = await this.resolverRolId(dto.rol);
    if (dto.jefe_id) {
      await this.verificarJefeExiste(dto.jefe_id);
    }
    if (dto.jefe_escuela_id) {
      await this.verificarJefeExiste(dto.jefe_escuela_id);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [creado] = await this.knex('usuarios')
      .insert({
        rol_id: rolId,
        jefe_id: dto.jefe_id ?? null,
        jefe_escuela_id: dto.jefe_escuela_id ?? null,
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        email,
        password_hash: passwordHash,
        cedula: dto.cedula.trim(),
        escuela: dto.escuela ?? null,
        dependencia: dto.dependencia ?? null,
        cargo: dto.cargo ?? null,
        activo: true,
      })
      .returning('id');

    return this.obtenerPublico(creado.id);
  }

  async actualizar(
    id: string,
    dto: ActualizarUsuarioDto,
  ): Promise<UsuarioPublico> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No se enviaron campos para actualizar.');
    }
    const actual = await this.buscarPorId(id);
    if (!actual) {
      throw new NotFoundException('El usuario no existe.');
    }

    const cambios: Record<string, unknown> = { updated_at: this.knex.fn.now() };

    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase().trim();
      await this.verificarEmailUnico(email, id);
      cambios.email = email;
    }
    if (dto.cedula !== undefined) {
      await this.verificarCedulaUnica(dto.cedula, id);
      cambios.cedula = dto.cedula.trim();
    }
    if (dto.rol !== undefined) {
      cambios.rol_id = await this.resolverRolId(dto.rol);
    }
    if (dto.jefe_id !== undefined && dto.jefe_id !== null) {
      if (dto.jefe_id === id) {
        throw new BadRequestException('Un usuario no puede ser su propio jefe.');
      }
      await this.verificarJefeExiste(dto.jefe_id);
      cambios.jefe_id = dto.jefe_id;
    }
    if (dto.jefe_id === null) {
      cambios.jefe_id = null;
    }
    if (dto.jefe_escuela_id !== undefined && dto.jefe_escuela_id !== null) {
      if (dto.jefe_escuela_id === id) {
        throw new BadRequestException(
          'Un usuario no puede ser su propio Jefe de Escuela.',
        );
      }
      await this.verificarJefeExiste(dto.jefe_escuela_id);
      cambios.jefe_escuela_id = dto.jefe_escuela_id;
    }
    if (dto.jefe_escuela_id === null) {
      cambios.jefe_escuela_id = null;
    }
    if (dto.nombre !== undefined) cambios.nombre = dto.nombre.trim();
    if (dto.apellido !== undefined) cambios.apellido = dto.apellido.trim();
    if (dto.escuela !== undefined) cambios.escuela = dto.escuela;
    if (dto.dependencia !== undefined) cambios.dependencia = dto.dependencia;
    if (dto.cargo !== undefined) cambios.cargo = dto.cargo;
    if (dto.activo !== undefined) cambios.activo = dto.activo;
    if (dto.password !== undefined) {
      cambios.password_hash = await bcrypt.hash(dto.password, 10);
      // Al cambiar la contraseña, invalidamos la sesión activa.
      cambios.refresh_token_hash = null;
    }

    await this.knex('usuarios').where('id', id).update(cambios);
    return this.obtenerPublico(id);
  }

  /**
   * Carga masiva de usuarios desde un CSV con un algoritmo de DOS FASES dentro
   * de una única transacción. Así, un usuario puede ser jefe de otro aunque
   * ambos lleguen en el mismo archivo (su UUID aún no existe al parsear).
   *
   *  - Fase 1: inserta todos los usuarios con `jefe_id`/`jefe_escuela_id` en
   *    null. El password por defecto es la cédula (hasheada).
   *  - Fase 2: con todos los usuarios ya en la BD, resuelve por email el UUID
   *    de cada jefe (de la BD previa o del propio CSV) y enlaza con un UPDATE.
   *
   * Si en la Fase 2 un email de jefe no existe (ni en la BD ni en el CSV), se
   * lanza una excepción → rollback de toda la transacción.
   */
  async cargaMasiva(contenidoCsv: string): Promise<{ creados: number }> {
    const filas = parsearCsvUsuarios(contenidoCsv);

    const roles = (await this.knex('roles').select('id', 'nombre')) as {
      id: number;
      nombre: string;
    }[];
    const usuarios = (await this.knex('usuarios').select(
      'email',
      'cedula',
    )) as { email: string; cedula: string }[];

    const ctx: ContextoCarga = {
      rolesPorNombre: new Map(roles.map((r) => [r.nombre, r.id])),
      emailsExistentes: new Set(usuarios.map((u) => u.email.toLowerCase())),
      cedulasExistentes: new Set(usuarios.map((u) => u.cedula)),
    };

    // Valida y prepara (lanza con el número de fila si algo falla). NO resuelve
    // jefes todavía: solo arrastra sus emails.
    const preparados = prepararUsuarios(filas, ctx);

    const conHash = await Promise.all(
      preparados.map(async (p) => ({
        ...p,
        password_hash: await bcrypt.hash(p.cedula, 10),
      })),
    );

    await this.knex.transaction(async (trx) => {
      // ---- FASE 1: inserción base (jefes en null) ----
      for (const u of conHash) {
        await trx('usuarios').insert({
          rol_id: u.rol_id,
          jefe_id: null,
          jefe_escuela_id: null,
          nombre: u.nombre,
          apellido: u.apellido,
          email: u.email,
          password_hash: u.password_hash,
          cedula: u.cedula,
          escuela: u.escuela,
          dependencia: u.dependencia,
          cargo: u.cargo,
          activo: true,
        });
      }

      // ---- FASE 2: enlace jerárquico ----
      // Mapa email→id de todos los usuarios referenciados como jefes. La consulta
      // corre dentro de la transacción, por lo que ya "ve" a los recién insertados.
      const emailsJefes = new Set<string>();
      for (const u of conHash) {
        if (u.email_jefe_inmediato) emailsJefes.add(u.email_jefe_inmediato);
        if (u.email_jefe_escuela) emailsJefes.add(u.email_jefe_escuela);
      }

      const idPorEmail = new Map<string, string>();
      if (emailsJefes.size > 0) {
        const filasJefes = (await trx('usuarios')
          .whereIn('email', [...emailsJefes])
          .select('id', 'email')) as { id: string; email: string }[];
        for (const f of filasJefes) {
          idPorEmail.set(f.email.toLowerCase(), f.id);
        }
      }

      for (const u of conHash) {
        const cambios: { jefe_id?: string; jefe_escuela_id?: string } = {};

        if (u.email_jefe_inmediato) {
          const id = idPorEmail.get(u.email_jefe_inmediato);
          if (!id) {
            throw new BadRequestException(
              `No se encontró el Jefe Inmediato con email "${u.email_jefe_inmediato}" (no existe en la base ni en el CSV).`,
            );
          }
          cambios.jefe_id = id;
        }

        if (u.email_jefe_escuela) {
          const id = idPorEmail.get(u.email_jefe_escuela);
          if (!id) {
            throw new BadRequestException(
              `No se encontró el Jefe de Escuela con email "${u.email_jefe_escuela}" (no existe en la base ni en el CSV).`,
            );
          }
          cambios.jefe_escuela_id = id;
        }

        if (
          cambios.jefe_id !== undefined ||
          cambios.jefe_escuela_id !== undefined
        ) {
          await trx('usuarios').where('email', u.email).update(cambios);
        }
      }
    });

    return { creados: conHash.length };
  }

  /** Activa o desactiva un usuario (soft delete). */
  async cambiarActivo(id: string, activo: boolean): Promise<UsuarioPublico> {
    const usuario = await this.buscarPorId(id);
    if (!usuario) {
      throw new NotFoundException('El usuario no existe.');
    }
    await this.knex('usuarios')
      .where('id', id)
      .update({
        activo,
        updated_at: this.knex.fn.now(),
        // Al desactivar, se cierra la sesión del usuario.
        ...(activo ? {} : { refresh_token_hash: null }),
      });
    return this.obtenerPublico(id);
  }

  private async resolverRolId(rol: Rol): Promise<number> {
    const fila = await this.knex('roles').where('nombre', rol).first();
    if (!fila) {
      throw new BadRequestException(`El rol ${rol} no existe.`);
    }
    return fila.id;
  }

  private async verificarEmailUnico(
    email: string,
    excluirId?: string,
  ): Promise<void> {
    const query = this.knex('usuarios').where('email', email);
    if (excluirId) query.andWhereNot('id', excluirId);
    if (await query.first()) {
      throw new ConflictException('Ya existe un usuario con ese email.');
    }
  }

  private async verificarCedulaUnica(
    cedula: string,
    excluirId?: string,
  ): Promise<void> {
    const query = this.knex('usuarios').where('cedula', cedula.trim());
    if (excluirId) query.andWhereNot('id', excluirId);
    if (await query.first()) {
      throw new ConflictException('Ya existe un usuario con esa cédula.');
    }
  }

  private async verificarJefeExiste(jefeId: string): Promise<void> {
    const jefe = await this.knex('usuarios').where('id', jefeId).first();
    if (!jefe) {
      throw new BadRequestException('El jefe indicado no existe.');
    }
  }
}
