import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { EVENTO_SESION_EXPIRADA, tokens } from './tokens';
import type { RespuestaApi } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({ baseURL: API_URL });

// --- Request: adjunta el access token salvo en login/refresh ---
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const url = config.url ?? '';
  const esAuthPublico =
    url.includes('/auth/login') ||
    url.includes('/auth/google') ||
    url.includes('/auth/refresh');
  const access = tokens.getAccess();
  if (access && !esAuthPublico) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${access}`);
    config.headers = headers;
  }
  return config;
});

// --- Response: ante un 401, intenta refrescar una sola vez y reintenta ---
let refrescando: Promise<string> | null = null;

async function refrescarTokens(): Promise<string> {
  const refresh = tokens.getRefresh();
  if (!refresh) throw new Error('Sin refresh token');

  const resp = await axios.post<RespuestaApi<{
    access_token: string;
    refresh_token: string;
  }>>(
    `${API_URL}/auth/refresh`,
    {},
    { headers: { Authorization: `Bearer ${refresh}` } },
  );
  const { access_token, refresh_token } = resp.data.data;
  tokens.set(access_token, refresh_token);
  return access_token;
}

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _reintento?: boolean })
      | undefined;
    const url = original?.url ?? '';
    const esRefresh = url.includes('/auth/refresh');
    const esLogin =
      url.includes('/auth/login') || url.includes('/auth/google');

    if (
      error.response?.status === 401 &&
      original &&
      !original._reintento &&
      !esRefresh &&
      !esLogin &&
      tokens.getRefresh()
    ) {
      original._reintento = true;
      try {
        refrescando = refrescando ?? refrescarTokens();
        const nuevoAccess = await refrescando;
        refrescando = null;
        const headers = AxiosHeaders.from(original.headers);
        headers.set('Authorization', `Bearer ${nuevoAccess}`);
        original.headers = headers;
        return api(original);
      } catch {
        refrescando = null;
        tokens.clear();
        window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
      }
    }
    return Promise.reject(error);
  },
);

/** Extrae un mensaje de error legible de una respuesta de error de la API. */
export function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    return data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : 'Error desconocido';
}
