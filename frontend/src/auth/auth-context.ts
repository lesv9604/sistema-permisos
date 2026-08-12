import { createContext, useContext } from 'react';
import type { Rol, UsuarioPublico } from '../types';

export interface AuthContextValue {
  usuario: UsuarioPublico | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  tieneRol: (...roles: Rol[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return ctx;
}
