import { Rol } from '../../common/enums/rol.enum';

/**
 * Fila de la tabla `usuarios` tal cual está en la base de datos.
 */
export interface UsuarioFila {
  id: string;
  rol_id: number;
  jefe_id: string | null;
  jefe_escuela_id: string | null;
  nombre: string;
  apellido: string;
  email: string;
  password_hash: string;
  cedula: string;
  escuela: string | null;
  dependencia: string | null;
  cargo: string | null;
  activo: boolean;
  debe_cambiar_password: boolean;
  refresh_token_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Usuario con el nombre de su rol resuelto (join con `roles`).
 * Es la forma que consumen auth y el resto de servicios.
 */
export interface UsuarioConRol extends UsuarioFila {
  rol: Rol;
}

/**
 * Vista pública de un usuario: nunca expone `password_hash` ni
 * `refresh_token_hash`.
 */
export interface UsuarioPublico {
  id: string;
  rol: Rol;
  jefe_id: string | null;
  jefe_escuela_id: string | null;
  nombre: string;
  apellido: string;
  email: string;
  cedula: string;
  escuela: string | null;
  dependencia: string | null;
  cargo: string | null;
  activo: boolean;
  debe_cambiar_password: boolean;
}

/** Resultado de crear un usuario: credenciales temporales y estado del correo. */
export interface UsuarioCreado {
  usuario: UsuarioPublico;
  correoEnviado: boolean;
  /** Solo se devuelve si el correo NO se envió, para entregarla manualmente. */
  passwordTemporal?: string;
}
