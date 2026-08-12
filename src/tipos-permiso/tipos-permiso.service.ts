import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.constants';
import { CrearTipoPermisoDto } from './dto/crear-tipo-permiso.dto';
import { ActualizarTipoPermisoDto } from './dto/actualizar-tipo-permiso.dto';
import { TipoPermiso } from './interfaces/tipo-permiso.interface';

@Injectable()
export class TiposPermisoService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  /** Lista los tipos de permiso. Por defecto solo los activos. */
  async listar(soloActivos = true): Promise<TipoPermiso[]> {
    const query = this.knex<TipoPermiso>('tipos_permiso').orderBy('nombre');
    if (soloActivos) {
      query.where('activo', true);
    }
    return query;
  }

  async obtenerPorId(id: number): Promise<TipoPermiso> {
    const tipo = await this.knex<TipoPermiso>('tipos_permiso')
      .where('id', id)
      .first();
    if (!tipo) {
      throw new NotFoundException(`No existe el tipo de permiso ${id}.`);
    }
    return tipo;
  }

  async crear(dto: CrearTipoPermisoDto): Promise<TipoPermiso> {
    await this.verificarNombreUnico(dto.nombre);

    const [tipo] = await this.knex<TipoPermiso>('tipos_permiso')
      .insert({
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion ?? null,
        requiere_soporte: dto.requiere_soporte ?? false,
        max_dias_anuales: dto.max_dias_anuales ?? null,
        con_remuneracion: dto.con_remuneracion ?? true,
        activo: dto.activo ?? true,
      })
      .returning('*');
    return tipo;
  }

  async actualizar(
    id: number,
    dto: ActualizarTipoPermisoDto,
  ): Promise<TipoPermiso> {
    if (Object.keys(dto).length === 0) {
      throw new ConflictException('No se enviaron campos para actualizar.');
    }

    // Asegura que existe (lanza 404 si no).
    await this.obtenerPorId(id);

    if (dto.nombre) {
      await this.verificarNombreUnico(dto.nombre, id);
    }

    const [tipo] = await this.knex<TipoPermiso>('tipos_permiso')
      .where('id', id)
      .update({
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: dto.descripcion }
          : {}),
        ...(dto.requiere_soporte !== undefined
          ? { requiere_soporte: dto.requiere_soporte }
          : {}),
        ...(dto.max_dias_anuales !== undefined
          ? { max_dias_anuales: dto.max_dias_anuales }
          : {}),
        ...(dto.con_remuneracion !== undefined
          ? { con_remuneracion: dto.con_remuneracion }
          : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      })
      .returning('*');
    return tipo;
  }

  /**
   * "Elimina" un tipo de permiso desactivándolo (soft delete). No se borra
   * físicamente porque `solicitudes_permiso` lo referencia con RESTRICT y
   * conviene preservar el histórico.
   */
  async desactivar(id: number): Promise<TipoPermiso> {
    await this.obtenerPorId(id);
    const [tipo] = await this.knex<TipoPermiso>('tipos_permiso')
      .where('id', id)
      .update({ activo: false })
      .returning('*');
    return tipo;
  }

  private async verificarNombreUnico(
    nombre: string,
    excluirId?: number,
  ): Promise<void> {
    const query = this.knex('tipos_permiso').whereRaw('LOWER(nombre) = ?', [
      nombre.trim().toLowerCase(),
    ]);
    if (excluirId) {
      query.andWhereNot('id', excluirId);
    }
    const existente = await query.first();
    if (existente) {
      throw new ConflictException(
        `Ya existe un tipo de permiso con el nombre "${nombre}".`,
      );
    }
  }
}
