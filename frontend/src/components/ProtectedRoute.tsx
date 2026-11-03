import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import type { Rol } from '../types';

/**
 * Protege rutas: exige sesión y, opcionalmente, uno de los roles indicados.
 * Mientras carga el perfil muestra un indicador.
 */
export function ProtectedRoute({ roles }: { roles?: Rol[] }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Cargando…
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Contraseña temporal: obligatorio cambiarla antes de usar el sistema.
  if (
    usuario.debe_cambiar_password &&
    location.pathname !== '/cambiar-password'
  ) {
    return <Navigate to="/cambiar-password" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(usuario.rol)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-lg font-semibold text-red-600">Acceso denegado</p>
        <p className="text-slate-500">
          No tienes permisos para ver esta sección.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
