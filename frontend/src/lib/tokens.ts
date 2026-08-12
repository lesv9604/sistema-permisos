const ACCESS = 'th_access_token';
const REFRESH = 'th_refresh_token';

export const tokens = {
  getAccess: (): string | null => localStorage.getItem(ACCESS),
  getRefresh: (): string | null => localStorage.getItem(REFRESH),
  set: (access: string, refresh: string): void => {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  },
  clear: (): void => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

/** Evento global que dispara el logout cuando el refresh token deja de servir. */
export const EVENTO_SESION_EXPIRADA = 'auth:sesion-expirada';
