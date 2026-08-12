import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { obtenerSocket } from '../lib/socket';
import { formatFechaHora } from '../lib/ui';
import {
  conteoNoLeidas,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from '../services/notificaciones';
import type { Notificacion } from '../types';

export function NotificationBell() {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: notificaciones = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => listarNotificaciones(false),
  });
  const { data: noLeidas = 0 } = useQuery({
    queryKey: ['notificaciones', 'conteo'],
    queryFn: conteoNoLeidas,
  });

  // Tiempo real: cada notificación entrante refresca las consultas.
  useEffect(() => {
    const socket = obtenerSocket();
    if (!socket) return;
    const handler = () => {
      void qc.invalidateQueries({ queryKey: ['notificaciones'] });
    };
    socket.on('notificacion', handler);
    return () => {
      socket.off('notificacion', handler);
    };
  }, [qc]);

  // Cierra el dropdown al hacer clic fuera.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const marcarUna = useMutation({
    mutationFn: marcarLeida,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });
  const marcarTodas = useMutation({
    mutationFn: marcarTodasLeidas,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  const alClicar = (n: Notificacion) => {
    if (!n.leida) marcarUna.mutate(n.id);
    if (n.solicitud_id) {
      setAbierto(false);
      navigate(`/solicitudes/${n.solicitud_id}`);
    }
  };

  return (
    <div className="relative" ref={contenedor}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notificaciones"
      >
        <span className="text-xl">🔔</span>
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-20 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="font-semibold">Notificaciones</span>
            {noLeidas > 0 && (
              <button
                onClick={() => marcarTodas.mutate()}
                className="text-xs text-marca-600 hover:underline"
              >
                Marcar todas
              </button>
            )}
          </div>
          {notificaciones.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              No tienes notificaciones.
            </p>
          ) : (
            <ul>
              {notificaciones.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => alClicar(n)}
                    className={`block w-full border-b px-4 py-3 text-left hover:bg-slate-50 ${
                      n.leida ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {!n.leida && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-marca-500" />
                      )}
                      <span className="text-sm font-medium">{n.titulo}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{n.mensaje}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatFechaHora(n.created_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
