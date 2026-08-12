import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import {
  conectarSocket,
  desconectarSocket,
} from '../lib/socket';
import { EVENTO_SESION_EXPIRADA, tokens } from '../lib/tokens';
import type { Rol, RespuestaApi, SesionData, UsuarioPublico } from '../types';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioPublico | null>(null);
  const [cargando, setCargando] = useState(true);

  const cerrarLocal = useCallback(() => {
    tokens.clear();
    desconectarSocket();
    setUsuario(null);
  }, []);

  // Carga inicial: si hay token, recupera el perfil.
  useEffect(() => {
    let activo = true;
    async function cargar() {
      if (!tokens.getAccess()) {
        setCargando(false);
        return;
      }
      try {
        const { data } = await api.get<RespuestaApi<UsuarioPublico>>(
          '/auth/me',
        );
        if (!activo) return;
        setUsuario(data.data);
        const access = tokens.getAccess();
        if (access) conectarSocket(access);
      } catch {
        if (activo) cerrarLocal();
      } finally {
        if (activo) setCargando(false);
      }
    }
    void cargar();
    return () => {
      activo = false;
    };
  }, [cerrarLocal]);

  // Si el refresh token expira, el interceptor dispara este evento.
  useEffect(() => {
    const handler = () => cerrarLocal();
    window.addEventListener(EVENTO_SESION_EXPIRADA, handler);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, handler);
  }, [cerrarLocal]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<RespuestaApi<SesionData>>('/auth/login', {
      email,
      password,
    });
    tokens.set(data.data.access_token, data.data.refresh_token);
    setUsuario(data.data.usuario);
    conectarSocket(data.data.access_token);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Aunque falle el logout en el servidor, limpiamos la sesión local.
    }
    cerrarLocal();
  }, [cerrarLocal]);

  const tieneRol = useCallback(
    (...roles: Rol[]) => !!usuario && roles.includes(usuario.rol),
    [usuario],
  );

  const value: AuthContextValue = {
    usuario,
    cargando,
    login,
    logout,
    tieneRol,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
