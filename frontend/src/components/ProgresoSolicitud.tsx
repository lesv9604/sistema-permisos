import type { EstadoSolicitud } from '../types';

const PASOS = [
  'Borrador',
  'Jefe de Escuela',
  'Jefe Inmediato',
  'Talento Humano',
  'Aprobada',
];

const INDICE: Record<EstadoSolicitud, number> = {
  BORRADOR: 0,
  PENDIENTE_JEFE_ESCUELA: 1,
  PENDIENTE_JEFE_INMEDIATO: 2,
  PENDIENTE_TALENTO_HUMANO: 3,
  APROBADA: 4,
  RECHAZADA: -1,
  CANCELADA: -1,
};

/**
 * Muestra el avance de una solicitud por el flujo de aprobación, resaltando
 * el nivel actual. Para estados terminales negativos muestra un aviso.
 */
export function ProgresoSolicitud({ estado }: { estado: EstadoSolicitud }) {
  if (estado === 'RECHAZADA' || estado === 'CANCELADA') {
    const esRechazo = estado === 'RECHAZADA';
    return (
      <div
        className={`rounded-md border px-4 py-3 text-sm font-medium ${
          esRechazo
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        {esRechazo
          ? 'Esta solicitud fue rechazada.'
          : 'Esta solicitud fue cancelada.'}
      </div>
    );
  }

  const actual = INDICE[estado];
  const aprobada = estado === 'APROBADA';

  return (
    <ol className="flex items-center">
      {PASOS.map((paso, i) => {
        const completado = i < actual || aprobada;
        const activo = i === actual && !aprobada;
        const esUltimo = i === PASOS.length - 1;

        const circulo = completado
          ? 'bg-green-500 text-white border-green-500'
          : activo
            ? 'bg-marca-600 text-white border-marca-600'
            : 'bg-white text-slate-400 border-slate-300';

        return (
          <li key={paso} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${circulo}`}
              >
                {completado ? '✓' : i + 1}
              </span>
              <span
                className={`mt-1 max-w-[5.5rem] text-center text-[11px] leading-tight ${
                  activo
                    ? 'font-semibold text-marca-700'
                    : completado
                      ? 'text-slate-600'
                      : 'text-slate-400'
                }`}
              >
                {paso}
              </span>
            </div>
            {!esUltimo && (
              <div
                className={`mx-1 h-0.5 flex-1 ${
                  i < actual || aprobada ? 'bg-green-500' : 'bg-slate-200'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
