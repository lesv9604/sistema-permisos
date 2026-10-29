import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { GoogleLogin } from '@react-oauth/google';
import { mensajeError } from '../lib/api';

const GOOGLE_HABILITADO = !!import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const GOOGLE_DOMINIO = import.meta.env.VITE_GOOGLE_HOSTED_DOMAIN?.trim();

export function LoginPage() {
  const { usuario, login, loginGoogle, cargando } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!cargando && usuario) {
    return <Navigate to="/solicitudes" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const onGoogle = async (credential?: string) => {
    if (!credential) {
      setError('No se recibió la credencial de Google.');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await loginGoogle(credential);
      navigate('/', { replace: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-bold text-marca-700">
          Talento Humano
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Gestión de permisos laborales
        </p>

        {GOOGLE_HABILITADO && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(r) => void onGoogle(r.credential)}
                onError={() =>
                  setError('No se pudo iniciar sesión con Google.')
                }
                hosted_domain={GOOGLE_DOMINIO || undefined}
                text="signin_with"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              o con correo y contraseña
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-marca-500 focus:outline-none focus:ring-1 focus:ring-marca-500"
              placeholder="usuario@dominio.com"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="password"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-marca-500 focus:outline-none focus:ring-1 focus:ring-marca-500"
              placeholder="••••••••"
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
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
