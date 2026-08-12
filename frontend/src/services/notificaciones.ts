import { api } from '../lib/api';
import type { Notificacion, RespuestaApi } from '../types';

export async function listarNotificaciones(
  soloNoLeidas = false,
): Promise<Notificacion[]> {
  const { data } = await api.get<RespuestaApi<Notificacion[]>>(
    '/notificaciones',
    { params: { soloNoLeidas } },
  );
  return data.data;
}

export async function conteoNoLeidas(): Promise<number> {
  const { data } = await api.get<RespuestaApi<{ noLeidas: number }>>(
    '/notificaciones/conteo-no-leidas',
  );
  return data.data.noLeidas;
}

export async function marcarLeida(id: number): Promise<void> {
  await api.patch(`/notificaciones/${id}/leer`);
}

export async function marcarTodasLeidas(): Promise<void> {
  await api.patch('/notificaciones/leer-todas');
}
