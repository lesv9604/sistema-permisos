import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.constants';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum';
import { UnidadTiempo } from '../common/enums/unidad-tiempo.enum';
import { FiltrosReporteDto } from './dto/filtros-reporte.dto';

export interface FilaReporte {
  id: string;
  docente_nombre: string;
  docente_apellido: string;
  departamento: string | null;
  tipo_permiso: string;
  estado: EstadoSolicitud;
  fecha_inicio: string;
  fecha_fin: string;
  unidad_tiempo: UnidadTiempo;
  cantidad_tiempo: number;
  created_at: Date;
  submitted_at: Date | null;
}

export interface ResumenReporte {
  totalSolicitudes: number;
  /** Suma de `cantidad_tiempo` de las solicitudes aprobadas. */
  cantidadAprobada: number;
  porEstado: Record<EstadoSolicitud, number>;
  porTipo: { tipo: string; solicitudes: number; cantidad: number }[];
}

const ESTADOS = Object.values(EstadoSolicitud);

@Injectable()
export class ReportesService {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  /** Query base con los joins y los filtros aplicados. */
  private baseQuery(filtros: FiltrosReporteDto): Knex.QueryBuilder {
    const query = this.knex('solicitudes_permiso as s')
      .join('tipos_permiso as tp', 's.tipo_permiso_id', 'tp.id')
      .join('usuarios as d', 's.docente_id', 'd.id');

    if (filtros.estado) query.where('s.estado', filtros.estado);
    if (filtros.tipo_permiso_id)
      query.where('s.tipo_permiso_id', filtros.tipo_permiso_id);
    if (filtros.departamento)
      query.whereILike('d.escuela', `%${filtros.departamento}%`);
    if (filtros.fecha_desde)
      query.where('s.fecha_inicio', '>=', filtros.fecha_desde);
    if (filtros.fecha_hasta)
      query.where('s.fecha_inicio', '<=', filtros.fecha_hasta);

    return query;
  }

  /** Resumen agregado: conteos por estado y por tipo, y totales. */
  async resumen(filtros: FiltrosReporteDto): Promise<ResumenReporte> {
    const filasEstado = (await this.baseQuery(filtros)
      .select('s.estado')
      .count('* as n')
      .sum('s.cantidad_tiempo as cantidad')
      .groupBy('s.estado')) as {
      estado: EstadoSolicitud;
      n: string;
      cantidad: string | null;
    }[];

    const porEstado = ESTADOS.reduce(
      (acc, e) => ({ ...acc, [e]: 0 }),
      {} as Record<EstadoSolicitud, number>,
    );
    let total = 0;
    let cantidadAprobada = 0;
    for (const fila of filasEstado) {
      const n = Number(fila.n);
      porEstado[fila.estado] = n;
      total += n;
      if (fila.estado === EstadoSolicitud.APROBADA) {
        cantidadAprobada = Number(fila.cantidad ?? 0);
      }
    }

    const filasTipo = await this.baseQuery(filtros)
      .select('tp.nombre as tipo')
      .count('* as solicitudes')
      .sum('s.cantidad_tiempo as cantidad')
      .groupBy('tp.nombre')
      .orderBy('tp.nombre');

    const porTipo = filasTipo.map(
      (f: { tipo: string; solicitudes: string; cantidad: string | null }) => ({
        tipo: f.tipo,
        solicitudes: Number(f.solicitudes),
        cantidad: Number(f.cantidad ?? 0),
      }),
    );

    return { totalSolicitudes: total, cantidadAprobada, porEstado, porTipo };
  }

  /** Listado detallado para el reporte. */
  async detalle(filtros: FiltrosReporteDto): Promise<FilaReporte[]> {
    return this.baseQuery(filtros)
      .select(
        's.id',
        this.knex.ref('d.nombre').as('docente_nombre'),
        this.knex.ref('d.apellido').as('docente_apellido'),
        this.knex.ref('d.escuela').as('departamento'),
        this.knex.ref('tp.nombre').as('tipo_permiso'),
        's.estado',
        's.fecha_inicio',
        's.fecha_fin',
        's.unidad_tiempo',
        's.cantidad_tiempo',
        's.created_at',
        's.submitted_at',
      )
      .orderBy('s.created_at', 'desc') as Promise<FilaReporte[]>;
  }

  /** Genera el CSV del listado detallado. */
  async generarCsv(filtros: FiltrosReporteDto): Promise<string> {
    const filas = await this.detalle(filtros);
    const cabeceras = [
      'Docente',
      'Departamento',
      'Tipo de permiso',
      'Estado',
      'Fecha inicio',
      'Fecha fin',
      'Cantidad',
      'Unidad',
      'Creada',
      'Enviada',
    ];

    const lineas = filas.map((f) =>
      [
        `${f.docente_nombre} ${f.docente_apellido}`,
        f.departamento ?? '',
        f.tipo_permiso,
        f.estado,
        f.fecha_inicio,
        f.fecha_fin,
        String(f.cantidad_tiempo),
        f.unidad_tiempo,
        f.created_at instanceof Date
          ? f.created_at.toISOString()
          : String(f.created_at),
        f.submitted_at
          ? f.submitted_at instanceof Date
            ? f.submitted_at.toISOString()
            : String(f.submitted_at)
          : '',
      ]
        .map((c) => this.escaparCsv(c))
        .join(','),
    );

    // BOM para que Excel reconozca UTF-8 con tildes.
    return [
      '﻿' + cabeceras.map((c) => this.escaparCsv(c)).join(','),
      ...lineas,
    ].join('\r\n');
  }

  private escaparCsv(valor: string): string {
    if (/[",\r\n]/.test(valor)) {
      return `"${valor.replace(/"/g, '""')}"`;
    }
    return valor;
  }
}
