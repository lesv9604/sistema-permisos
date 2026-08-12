import type { EstadoSolicitud } from '../types';
import { ESTADO_INFO } from '../lib/ui';

export function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  const info = ESTADO_INFO[estado];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${info.clase}`}
    >
      {info.texto}
    </span>
  );
}
