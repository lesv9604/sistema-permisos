import { api } from '../lib/api';
import type {
  EstadoSolicitud,
  HistorialEntrada,
  RespuestaApi,
  Solicitud,
  UnidadTiempo,
} from '../types';

export interface FiltrosSolicitudes {
  estado?: EstadoSolicitud;
  tipo_permiso_id?: number;
}

export interface CrearSolicitudInput {
  tipo_permiso_id: number;
  unidad_tiempo: UnidadTiempo;
  cantidad_tiempo?: number;
  hora_inicio?: string;
  hora_fin?: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo?: string;
  observaciones?: string;
  docente_sustituto_id?: string;
  plan_trabajo_adjunto?: string;
  documento_soporte?: string;
}

export type AccionFlujo = 'enviar' | 'aprobar' | 'rechazar' | 'cancelar';

export async function listarSolicitudes(
  filtros: FiltrosSolicitudes = {},
): Promise<Solicitud[]> {
  const { data } = await api.get<RespuestaApi<Solicitud[]>>('/permisos', {
    params: filtros,
  });
  return data.data;
}

export interface ResumenPermisos {
  total: number;
  porEstado: Record<EstadoSolicitud, number>;
}

export async function obtenerResumen(): Promise<ResumenPermisos> {
  const { data } = await api.get<RespuestaApi<ResumenPermisos>>(
    '/permisos/resumen',
  );
  return data.data;
}

export interface InfoCuota {
  max: number | null;
  consumido: number;
  disponible: number | null;
}

export async function obtenerCuota(
  tipoPermisoId: number,
): Promise<InfoCuota> {
  const { data } = await api.get<RespuestaApi<InfoCuota>>('/permisos/cuota', {
    params: { tipo_permiso_id: tipoPermisoId },
  });
  return data.data;
}

export async function obtenerSolicitud(id: string): Promise<Solicitud> {
  const { data } = await api.get<RespuestaApi<Solicitud>>(`/permisos/${id}`);
  return data.data;
}

export async function crearSolicitud(
  input: CrearSolicitudInput,
): Promise<Solicitud> {
  const { data } = await api.post<RespuestaApi<Solicitud>>('/permisos', input);
  return data.data;
}

export async function eliminarSolicitud(id: string): Promise<void> {
  await api.delete(`/permisos/${id}`);
}

export async function ejecutarAccion(
  id: string,
  accion: AccionFlujo,
  comentario?: string,
): Promise<Solicitud> {
  const { data } = await api.post<RespuestaApi<Solicitud>>(
    `/permisos/${id}/${accion}`,
    comentario ? { comentario } : {},
  );
  return data.data;
}

export async function obtenerHistorial(
  id: string,
): Promise<HistorialEntrada[]> {
  const { data } = await api.get<RespuestaApi<HistorialEntrada[]>>(
    `/permisos/${id}/historial`,
  );
  return data.data;
}
