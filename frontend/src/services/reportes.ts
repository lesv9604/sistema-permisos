import { api } from '../lib/api';
import type { EstadoSolicitud, RespuestaApi, UnidadTiempo } from '../types';

export interface FiltrosReporte {
  estado?: EstadoSolicitud;
  tipo_permiso_id?: number;
  departamento?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface ResumenReporte {
  totalSolicitudes: number;
  cantidadAprobada: number;
  porEstado: Record<EstadoSolicitud, number>;
  porTipo: { tipo: string; solicitudes: number; cantidad: number }[];
}

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
  created_at: string;
  submitted_at: string | null;
}

/** Limpia las claves vacías para no enviar params en blanco. */
function limpiar(filtros: FiltrosReporte): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v !== '' && v !== undefined),
  );
}

export async function obtenerResumen(
  filtros: FiltrosReporte,
): Promise<ResumenReporte> {
  const { data } = await api.get<RespuestaApi<ResumenReporte>>(
    '/reportes/resumen',
    { params: limpiar(filtros) },
  );
  return data.data;
}

export async function obtenerDetalle(
  filtros: FiltrosReporte,
): Promise<FilaReporte[]> {
  const { data } = await api.get<RespuestaApi<FilaReporte[]>>(
    '/reportes/solicitudes',
    { params: limpiar(filtros) },
  );
  return data.data;
}

/** Descarga el CSV (con el token adjunto) y dispara la descarga en el navegador. */
export async function descargarCsv(filtros: FiltrosReporte): Promise<void> {
  const resp = await api.get('/reportes/solicitudes.csv', {
    params: limpiar(filtros),
    responseType: 'blob',
  });
  const url = URL.createObjectURL(resp.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-permisos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
