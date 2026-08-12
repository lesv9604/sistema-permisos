import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { ROL_TEXTO } from '../lib/ui';
import { NotificationBell } from './NotificationBell';

export function Layout() {
  const { usuario, logout, tieneRol } = useAuth();
  const navigate = useNavigate();

  const cerrarSesion = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const claseLink = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${
      isActive
        ? 'bg-marca-600 text-white'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-marca-700">
              Talento Humano
            </span>
            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={claseLink}>
                Inicio
              </NavLink>
              <NavLink to="/solicitudes" className={claseLink}>
                Solicitudes
              </NavLink>
              <NavLink to="/solicitudes/nueva" className={claseLink}>
                Nueva
              </NavLink>
              {tieneRol('TALENTO_HUMANO', 'ADMIN') && (
                <NavLink to="/reportes" className={claseLink}>
                  Reportes
                </NavLink>
              )}
              {tieneRol('ADMIN') && (
                <>
                  <NavLink to="/usuarios" className={claseLink}>
                    Usuarios
                  </NavLink>
                  <NavLink to="/tipos-permiso" className={claseLink}>
                    Tipos de permiso
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight">
                {usuario?.nombre} {usuario?.apellido}
              </p>
              <p className="text-xs text-slate-500">
                {usuario && ROL_TEXTO[usuario.rol]}
              </p>
            </div>
            <button
              onClick={cerrarSesion}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
