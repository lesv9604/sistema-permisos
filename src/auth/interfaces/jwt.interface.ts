import { Rol } from '../../common/enums/rol.enum';

/**
 * Contenido (payload) firmado dentro de los JWT.
 * `sub` es el UUID del usuario.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  rol: Rol;
  /** Identificador único del token; garantiza que cada token emitido difiera. */
  jti?: string;
}

/**
 * Usuario autenticado que se adjunta a `request.user` tras validar el
 * access token. Es la forma mínima que consumen guards y controladores.
 */
export interface UsuarioAutenticado {
  id: string;
  email: string;
  rol: Rol;
}

/**
 * Igual que `UsuarioAutenticado` pero incluye el refresh token en claro,
 * necesario para validarlo contra el hash almacenado durante el refresh.
 */
export interface UsuarioConRefresh extends UsuarioAutenticado {
  refreshToken: string;
}
