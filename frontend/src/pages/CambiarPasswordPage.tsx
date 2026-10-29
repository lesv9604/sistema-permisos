import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { mensajeError } from '../lib/api';

/**
 * Cambio de contraseña. Obligatorio cuando el usuario tiene una contraseña
 * temporal (`debe_cambiar_password`); también accesible voluntariamente.
 */
export function CambiarPasswordPage() {
  const { usuario, cambiarPassword, logout } = useAuth();
  const navigate = useNavigate();
  const obligatorio = !!usuario?.debe_cambiar_password;

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nueva !== confirmar) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setEnviando(true);
    try {
      await cambiarPassword(actual, nueva);
      navigate('/', { replace: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const salir = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const entrada =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-marca-500 focus:outline-none focus:ring-1 focus:ring-marca-500';

  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-bold text-marca-700">
          Cambiar contraseña
        </h1>
        {obligatorio && (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Estás usando una contraseña temporal. Debes cambiarla para
            continuar.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="actual">
              Contraseña actual {obligatorio && '(la temporal)'}
            </label>
            <input
              id="actual"
              type="password"
              required
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              className={entrada}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="nueva">
              Nueva contraseña
            </label>
            <input
              id="nueva"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              className={entrada}
            />
            <p className="mt-1 text-xs text-slate-500">
              Mínimo 10 caracteres, con letras y números. No uses tu cédula ni
              tu usuario de correo.
            </p>
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="confirmar"
            >
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmar"
              type="password"
              required
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className={entrada}
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-md bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700 disabled:opacity-60"
          >
            {enviando ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {obligatorio ? (
            <button onClick={salir} className="text-slate-500 underline">
              Cerrar sesión
            </button>
          ) : (
            <Link to="/" className="text-slate-500 underline">
              Volver
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
