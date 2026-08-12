import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/auth-context';
import { EstadoBadge } from '../components/EstadoBadge';
import { ESTADO_INFO, formatFecha, formatTiempo } from '../lib/ui';
import { listarSolicitudes } from '../services/permisos';
import type { EstadoSolicitud } from '../types';

const ESTADOS = Object.keys(ESTADO_INFO) as EstadoSolicitud[];

export function SolicitudesPage() {
  const { tieneRol } = useAuth();
  const [estado, setEstado] = useState<EstadoSolicitud | ''>('');
  const verColumnaDocente = tieneRol(
    'JEFE_INMEDIATO',
    'TALENTO_HUMANO',
    'ADMIN',
  );

  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['solicitudes', { estado }],
    queryFn: () =>
      listarSolicitudes(estado ? { estado } : {}),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Solicitudes de permiso</h1>
        <Link
          to="/solicitudes/nueva"
          className="rounded-md bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700"
        >
          + Nueva solicitud
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-slate-600">Filtrar por estado:</label>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoSolicitud | '')}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ESTADO_INFO[e].texto}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {verColumnaDocente && <th className="px-4 py-2">Docente</th>}
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Desde</th>
              <th className="px-4 py-2">Hasta</th>
              <th className="px-4 py-2">Tiempo</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            ) : solicitudes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No hay solicitudes.
                </td>
              </tr>
            ) : (
              solicitudes.map((s) => (
                <tr key={s.id} className="border-t hover:bg-slate-50">
                  {verColumnaDocente && (
                    <td className="px-4 py-2">
                      {s.docente_nombre} {s.docente_apellido}
                    </td>
                  )}
                  <td className="px-4 py-2">{s.tipo_permiso_nombre}</td>
                  <td className="px-4 py-2">{formatFecha(s.fecha_inicio)}</td>
                  <td className="px-4 py-2">{formatFecha(s.fecha_fin)}</td>
                  <td className="px-4 py-2">
                    {formatTiempo(s.unidad_tiempo, s.cantidad_tiempo)}
                  </td>
                  <td className="px-4 py-2">
                    <EstadoBadge estado={s.estado} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/solicitudes/${s.id}`}
                      className="text-marca-600 hover:underline"
                    >
                      Ver
                    </Link>
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
