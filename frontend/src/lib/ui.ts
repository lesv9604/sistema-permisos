import type { EstadoSolicitud, Rol, UnidadTiempo } from '../types';

export const ESTADO_INFO: Record<
  EstadoSolicitud,
  { texto: string; clase: string }
> = {
  BORRADOR: { texto: 'Borrador', clase: 'bg-slate-200 text-slate-700' },
  PENDIENTE_JEFE_ESCUELA: {
    texto: 'Pendiente Jefe de Escuela',
    clase: 'bg-amber-100 text-amber-800',
  },
  PENDIENTE_JEFE_INMEDIATO: {
    texto: 'Pendiente Jefe Inmediato',
    clase: 'bg-orange-100 text-orange-800',
  },
  PENDIENTE_TALENTO_HUMANO: {
    texto: 'Pendiente de Talento Humano',
    clase: 'bg-indigo-100 text-indigo-800',
  },
  APROBADA: { texto: 'Aprobada', clase: 'bg-green-100 text-green-800' },
  RECHAZADA: { texto: 'Rechazada', clase: 'bg-red-100 text-red-800' },
  CANCELADA: { texto: 'Cancelada', clase: 'bg-slate-300 text-slate-600' },
};

export const ROL_TEXTO: Record<Rol, string> = {
  DOCENTE: 'Docente',
  JEFE_INMEDIATO: 'Jefe inmediato',
  JEFE_ESCUELA: 'Jefe de Escuela',
  TALENTO_HUMANO: 'Talento Humano',
  ADMIN: 'Administrador',
};

/** Formatea una marca de tiempo ISO a fecha y hora local legible. */
export function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Las fechas de permiso vienen como 'YYYY-MM-DD'. */
export function formatFecha(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return `${d}/${m}/${a}`;
}

/** Formatea la cantidad y unidad de tiempo de un permiso (p. ej. "3 días"). */
export function formatTiempo(
  unidad: UnidadTiempo,
  cantidad: number,
): string {
  if (unidad === 'HORAS') {
    return `${cantidad} ${cantidad === 1 ? 'hora' : 'horas'}`;
  }
  return `${cantidad} ${cantidad === 1 ? 'día' : 'días'}`;
}
