import { api } from '../lib/api';
import type { RespuestaApi, TipoPermiso } from '../types';

export interface TipoPermisoInput {
  nombre: string;
  descripcion?: string;
  requiere_soporte?: boolean;
  max_dias_anuales?: number;
  con_remuneracion?: boolean;
  activo?: boolean;
}

export async function listarTipos(
  soloActivos = true,
): Promise<TipoPermiso[]> {
  const { data } = await api.get<RespuestaApi<TipoPermiso[]>>(
    '/tipos-permiso',
    { params: { soloActivos } },
  );
  return data.data;
}

export async function crearTipo(
  input: TipoPermisoInput,
): Promise<TipoPermiso> {
  const { data } = await api.post<RespuestaApi<TipoPermiso>>(
    '/tipos-permiso',
    input,
  );
  return data.data;
}

export async function actualizarTipo(
  id: number,
  input: Partial<TipoPermisoInput>,
): Promise<TipoPermiso> {
  const { data } = await api.patch<RespuestaApi<TipoPermiso>>(
    `/tipos-permiso/${id}`,
    input,
  );
  return data.data;
}

export async function desactivarTipo(id: number): Promise<TipoPermiso> {
  const { data } = await api.delete<RespuestaApi<TipoPermiso>>(
    `/tipos-permiso/${id}`,
  );
  return data.data;
}
