import { io, type Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

/** Conecta (o reconecta) el socket autenticado con el access token. */
export function conectarSocket(accessToken: string): Socket {
  if (socket) {
    socket.disconnect();
  }
  socket = io(WS_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
  });
  return socket;
}

export function obtenerSocket(): Socket | null {
  return socket;
}

export function desconectarSocket(): void {
  socket?.disconnect();
  socket = null;
}
