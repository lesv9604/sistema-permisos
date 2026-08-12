import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.constants';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum';
import { UnidadTiempo } from '../common/enums/unidad-tiempo.enum';
import {
  aDias,
  calcularConsumoDias,
  excedeCuota,
} from '../common/utils/cuota.util';

export interface InfoCuota {
  /** Límite anual en días (null = sin límite). */
  max: number | null;
  /** Días ya consumidos (aprobados) en el año. */
  consumido: number;
  /** Días disponibles (null si no hay límite). */
  disponible: number | null;
}

interface ParamsVerificacion {
  docenteId: string;
  tipoPermisoId: number;
  fechaInicio: string; // 'YYYY-MM-DD'
  unidad: UnidadTiempo;
  cantidad: number;
  excluirSolicitudId?: string;
}

@Injectable()
export class CuotaService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  /**
   * Lanza si la nueva solicitud excede la cuota anual del tipo de permiso.
   * Acepta `db` (knex o trx) para participar en la transacción del flujo.
   * Solo cuentan las solicitudes APROBADAS del mismo año (por `fecha_inicio`).
   */
  async verificarCuota(db: Knex, p: ParamsVerificacion): Promise<void> {
    const tipo = await db('tipos_permiso')
      .where('id', p.tipoPermisoId)
      .first();
    if (!tipo || tipo.max_dias_anuales === null) {
      return; // sin límite configurado
    }

    const anio = Number(p.fechaInicio.slice(0, 4));
    const consumido = await this.consumoAprobado(
      db,
      p.docenteId,
      p.tipoPermisoId,
      anio,
      p.excluirSolicitudId,
    );
    const nuevo = aDias(p.unidad, p.cantidad);

    if (excedeCuota(consumido, nuevo, tipo.max_dias_anuales)) {
      const disponible = Math.max(0, tipo.max_dias_anuales - consumido);
      throw new BadRequestException(
        `Cuota anual superada para "${tipo.nombre}": límite ${tipo.max_dias_anuales} día(s), ` +
          `ya tienes ${consumido} aprobado(s) en ${anio} (disponible ${disponible}), ` +
          `y esta solicitud suma ${nuevo}.`,
      );
    }
  }

  /** Devuelve el estado de la cuota de un docente para un tipo y año. */
  async obtenerCuota(
    docenteId: string,
    tipoPermisoId: number,
    anio: number,
  ): Promise<InfoCuota> {
    const tipo = await this.knex('tipos_permiso')
      .where('id', tipoPermisoId)
      .first();
    const max: number | null = tipo?.max_dias_anuales ?? null;
    const consumido = await this.consumoAprobado(
      this.knex,
      docenteId,
      tipoPermisoId,
      anio,
    );
    return {
      max,
      consumido,
      disponible: max === null ? null : Math.max(0, max - consumido),
    };
  }

  /** Días consumidos (aprobados) por un docente en un tipo y año. */
  private async consumoAprobado(
    db: Knex,
    docenteId: string,
    tipoPermisoId: number,
    anio: number,
    excluirSolicitudId?: string,
  ): Promise<number> {
    const query = db('solicitudes_permiso')
      .where('docente_id', docenteId)
      .where('tipo_permiso_id', tipoPermisoId)
      .where('estado', EstadoSolicitud.APROBADA)
      .whereRaw('EXTRACT(YEAR FROM fecha_inicio) = ?', [anio]);
    if (excluirSolicitudId) {
      query.whereNot('id', excluirSolicitudId);
    }
    const filas = (await query.select(
      'unidad_tiempo',
      'cantidad_tiempo',
    )) as { unidad_tiempo: UnidadTiempo; cantidad_tiempo: number }[];
    return calcularConsumoDias(filas);
  }
}
