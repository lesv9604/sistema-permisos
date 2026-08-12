import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.constants';
import {
  HistorialConUsuario,
  NuevoHistorial,
} from './interfaces/historial.interface';

@Injectable()
export class HistorialService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  /**
   * Registra una entrada de historial. Recibe el `trx` para participar en la
   * MISMA transacción que el cambio de estado (regla del CLAUDE.md: solo INSERT).
   */
  async registrar(trx: Knex, datos: NuevoHistorial): Promise<void> {
    await trx('historial_aprobaciones').insert(datos);
  }

  /** Lista el historial de una solicitud, del más antiguo al más reciente. */
  async listarPorSolicitud(
    solicitudId: string,
  ): Promise<HistorialConUsuario[]> {
    return this.knex<HistorialConUsuario>('historial_aprobaciones as h')
      .join('usuarios as u', 'h.usuario_id', 'u.id')
      .where('h.solicitud_id', solicitudId)
      .orderBy('h.created_at', 'asc')
      .select(
        'h.*',
        this.knex.ref('u.nombre').as('usuario_nombre'),
        this.knex.ref('u.apellido').as('usuario_apellido'),
      ) as unknown as Promise<HistorialConUsuario[]>;
  }
}
