import { api } from '../lib/api';
import type { Rol, RespuestaApi, UsuarioPublico } from '../types';

export interface CrearUsuarioInput {
  rol: Rol;
  nombre: string;
  apellido: string;
  email: string;
  /** Opcional: vacío = el sistema genera una contraseña temporal. */
  password?: string;
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

export interface CredencialTemporal {
  email: string;
  passwordTemporal: string;
}

export interface UsuarioCreado {
  usuario: UsuarioPublico;
  correoEnviado: boolean;
  /** Solo viene si el correo NO se envió. */
  passwordTemporal?: string;
}

export async function crearUsuario(
  input: CrearUsuarioInput,
): Promise<UsuarioCreado & { message: string }> {
  const { data } = await api.post<RespuestaApi<UsuarioCreado>>(
    '/usuarios',
    input,
  );
  return { ...data.data, message: data.message };
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
): Promise<{
  creados: number;
  correosEnviados: number;
  sinCorreo: CredencialTemporal[];
  message: string;
}> {
  const form = new FormData();
  form.append('file', archivo);
  const { data } = await api.post<
    RespuestaApi<{
      creados: number;
      correosEnviados: number;
      sinCorreo: CredencialTemporal[];
    }>
  >('/usuarios/carga-masiva', form);
  return { ...data.data, message: data.message };
}
