import { api } from '../lib/api';
import type { Rol, RespuestaApi, UsuarioPublico } from '../types';

export interface CrearUsuarioInput {
  rol: Rol;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  cedula: string;
  escuela?: string;
  dependencia?: string;
  cargo?: string;
  jefe_id?: string;
  jefe_escuela_id?: string;
}

export type ActualizarUsuarioInput = Partial<
  Omit<CrearUsuarioInput, 'password' | 'jefe_id' | 'jefe_escuela_id'>
> & {
  password?: string;
  jefe_id?: string | null;
  jefe_escuela_id?: string | null;
  activo?: boolean;
};

export interface FiltrosUsuarios {
  rol?: Rol;
  activo?: boolean;
}

export async function listarUsuarios(
  filtros: FiltrosUsuarios = {},
): Promise<UsuarioPublico[]> {
  const { data } = await api.get<RespuestaApi<UsuarioPublico[]>>('/usuarios', {
    params: filtros,
  });
  return data.data;
}

export async function crearUsuario(
  input: CrearUsuarioInput,
): Promise<UsuarioPublico> {
  const { data } = await api.post<RespuestaApi<UsuarioPublico>>(
    '/usuarios',
    input,
  );
  return data.data;
}

export async function actualizarUsuario(
  id: string,
  input: ActualizarUsuarioInput,
): Promise<UsuarioPublico> {
  const { data } = await api.patch<RespuestaApi<UsuarioPublico>>(
    `/usuarios/${id}`,
    input,
  );
  return data.data;
}

export async function desactivarUsuario(id: string): Promise<UsuarioPublico> {
  const { data } = await api.delete<RespuestaApi<UsuarioPublico>>(
    `/usuarios/${id}`,
  );
  return data.data;
}

export async function cargaMasivaUsuarios(
  archivo: File,
): Promise<{ creados: number; message: string }> {
  const form = new FormData();
  form.append('file', archivo);
  const { data } = await api.post<RespuestaApi<{ creados: number }>>(
    '/usuarios/carga-masiva',
    form,
  );
  return { creados: data.data.creados, message: data.message };
}
