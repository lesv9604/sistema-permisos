import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EstadoBadge } from '../components/EstadoBadge';
import { mensajeError } from '../lib/api';
import { ESTADO_INFO, formatFecha, formatTiempo } from '../lib/ui';
import {
  descargarCsv,
  obtenerDetalle,
  obtenerResumen,
  type FiltrosReporte,
} from '../services/reportes';
import type { EstadoSolicitud } from '../types';

const ESTADOS = Object.keys(ESTADO_INFO) as EstadoSolicitud[];

export function ReportesPage() {
  const [filtros, setFiltros] = useState<FiltrosReporte>({});
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: resumen } = useQuery({
    queryKey: ['reporte', 'resumen', filtros],
    queryFn: () => obtenerResumen(filtros),
  });
  const { data: detalle = [], isLoading } = useQuery({
    queryKey: ['reporte', 'detalle', filtros],
    queryFn: () => obtenerDetalle(filtros),
  });

  const set = (k: keyof FiltrosReporte, v: string) =>
    setFiltros((f) => ({ ...f, [k]: v || undefined }));

  const exportar = async () => {
    setError(null);
    setDescargando(true);
    try {
      await descargarCsv(filtros);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <button
          onClick={exportar}
          disabled={descargando}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {descargando ? 'Generando…' : '⬇ Descargar CSV'}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Filtros */}
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            Estado
          </span>
          <select
            value={filtros.estado ?? ''}
            onChange={(e) => set('estado', e.target.value)}
            className="entrada"
          >
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_INFO[e].texto}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            Departamento
          </span>
          <input
            value={filtros.departamento ?? ''}
            onChange={(e) => set('departamento', e.target.value)}
            className="entrada"
            placeholder="Contiene…"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            Desde (inicio)
          </span>
          <input
            type="date"
            value={filtros.fecha_desde ?? ''}
            onChange={(e) => set('fecha_desde', e.target.value)}
            className="entrada"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            Hasta (inicio)
          </span>
          <input
            type="date"
            value={filtros.fecha_hasta ?? ''}
            onChange={(e) => set('fecha_hasta', e.target.value)}
            className="entrada"
          />
        </label>
      </div>

      {/* Tarjetas de resumen */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tarjeta
          titulo="Total solicitudes"
          valor={resumen?.totalSolicitudes ?? 0}
        />
        <Tarjeta
          titulo="Cantidad aprobada"
          valor={resumen?.cantidadAprobada ?? 0}
          color="text-green-600"
        />
        <Tarjeta
          titulo="Pendientes"
          valor={
            (resumen?.porEstado.PENDIENTE_JEFE_ESCUELA ?? 0) +
            (resumen?.porEstado.PENDIENTE_JEFE_INMEDIATO ?? 0) +
            (resumen?.porEstado.PENDIENTE_TALENTO_HUMANO ?? 0)
          }
          color="text-amber-600"
        />
        <Tarjeta
          titulo="Rechazadas"
          valor={resumen?.porEstado.RECHAZADA ?? 0}
          color="text-red-600"
        />
      </div>

      {/* Desglose por tipo */}
      {resumen && resumen.porTipo.length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">
            Por tipo de permiso
          </h2>
          <div className="flex flex-wrap gap-3">
            {resumen.porTipo.map((t) => (
              <div
                key={t.tipo}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="font-medium">{t.tipo}</span>:{' '}
                {t.solicitudes} solicitud(es), {t.cantidad} (días/horas)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalle */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Docente</th>
              <th className="px-4 py-2">Departamento</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Desde</th>
              <th className="px-4 py-2">Hasta</th>
              <th className="px-4 py-2">Tiempo</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            ) : detalle.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No hay resultados con esos filtros.
                </td>
              </tr>
            ) : (
              detalle.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="px-4 py-2">
                    {f.docente_nombre} {f.docente_apellido}
                  </td>
                  <td className="px-4 py-2">{f.departamento ?? '—'}</td>
                  <td className="px-4 py-2">{f.tipo_permiso}</td>
                  <td className="px-4 py-2">{formatFecha(f.fecha_inicio)}</td>
                  <td className="px-4 py-2">{formatFecha(f.fecha_fin)}</td>
                  <td className="px-4 py-2">
                    {formatTiempo(f.unidad_tiempo, f.cantidad_tiempo)}
                  </td>
                  <td className="px-4 py-2">
                    <EstadoBadge estado={f.estado} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  color = 'text-slate-800',
}: {
  titulo: string;
  valor: number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{valor}</p>
    </div>
  );
}
