import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/auth-context';
import { EstadoBadge } from '../components/EstadoBadge';
import { ESTADO_INFO, ROL_TEXTO, formatFecha, formatTiempo } from '../lib/ui';
import { listarSolicitudes, obtenerResumen } from '../services/permisos';
import { conteoNoLeidas } from '../services/notificaciones';
import type { EstadoSolicitud } from '../types';

const ESTADOS = Object.keys(ESTADO_INFO) as EstadoSolicitud[];

export function DashboardPage() {
  const { usuario, tieneRol } = useAuth();

  const { data: resumen } = useQuery({
    queryKey: ['permisos', 'resumen'],
    queryFn: obtenerResumen,
  });
  const { data: recientes = [] } = useQuery({
    queryKey: ['solicitudes', { recientes: true }],
    queryFn: () => listarSolicitudes(),
  });
  const { data: noLeidas = 0 } = useQuery({
    queryKey: ['notificaciones', 'conteo'],
    queryFn: conteoNoLeidas,
  });

  const pe = resumen?.porEstado;

  // Métrica de "acción requerida" según el rol.
  const accion = (() => {
    if (!usuario || !pe) return { label: 'Acción requerida', valor: 0 };
    switch (usuario.rol) {
      case 'JEFE_ESCUELA':
        return {
          label: 'Pendientes de tu aprobación',
          valor: pe.PENDIENTE_JEFE_ESCUELA,
        };
      case 'JEFE_INMEDIATO':
        return {
          label: 'Pendientes de tu aprobación',
          valor: pe.PENDIENTE_JEFE_INMEDIATO,
        };
      case 'TALENTO_HUMANO':
        return {
          label: 'Pendientes de Talento Humano',
          valor: pe.PENDIENTE_TALENTO_HUMANO,
        };
      case 'ADMIN':
        return {
          label: 'Pendientes en el sistema',
          valor:
            pe.PENDIENTE_JEFE_ESCUELA +
            pe.PENDIENTE_JEFE_INMEDIATO +
            pe.PENDIENTE_TALENTO_HUMANO,
        };
      default:
        return { label: 'Borradores por enviar', valor: pe.BORRADOR };
    }
  })();

  // Estados sobre los que el usuario puede actuar ahora mismo (bandeja).
  const esDocentePuro = usuario?.rol === 'DOCENTE';
  const accionables: EstadoSolicitud[] = esDocentePuro
    ? ['BORRADOR']
    : usuario?.rol === 'JEFE_ESCUELA'
      ? ['PENDIENTE_JEFE_ESCUELA']
      : usuario?.rol === 'JEFE_INMEDIATO'
        ? ['PENDIENTE_JEFE_INMEDIATO']
        : usuario?.rol === 'TALENTO_HUMANO'
          ? ['PENDIENTE_TALENTO_HUMANO']
          : usuario?.rol === 'ADMIN'
            ? [
                'PENDIENTE_JEFE_ESCUELA',
                'PENDIENTE_JEFE_INMEDIATO',
                'PENDIENTE_TALENTO_HUMANO',
              ]
            : [];
  const pendientes = recientes.filter((s) => accionables.includes(s.estado));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Hola, {usuario?.nombre} 👋
        </h1>
        <p className="text-sm text-slate-500">
          {usuario && ROL_TEXTO[usuario.rol]}
          {usuario?.escuela ? ` · ${usuario.escuela}` : ''}
        </p>
      </div>

      {/* Tarjetas principales */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tarjeta titulo="Total visibles" valor={resumen?.total ?? 0} />
        <Tarjeta
          titulo={accion.label}
          valor={accion.valor}
          color="text-amber-600"
          destacar
        />
        <Tarjeta
          titulo="Aprobadas"
          valor={pe?.APROBADA ?? 0}
          color="text-green-600"
        />
        <Tarjeta
          titulo="Notificaciones sin leer"
          valor={noLeidas}
          color="text-marca-600"
        />
      </div>

      {/* Bandeja: pendientes de tu acción */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700">{accion.label}</h2>
          {pendientes.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {pendientes.length}
            </span>
          )}
        </div>
        {pendientes.length === 0 ? (
          <p className="py-2 text-sm text-slate-400">
            No tienes nada pendiente. 🎉
          </p>
        ) : (
          <ul className="divide-y">
            {pendientes.slice(0, 6).map((s) => (
              <li key={s.id}>
                <Link
                  to={`/solicitudes/${s.id}`}
                  className="flex items-center justify-between px-1 py-2.5 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {s.tipo_permiso_nombre} ·{' '}
                      {formatTiempo(s.unidad_tiempo, s.cantidad_tiempo)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.docente_nombre} {s.docente_apellido} ·{' '}
                      {formatFecha(s.fecha_inicio)} – {formatFecha(s.fecha_fin)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-marca-600">
                    {esDocentePuro ? 'Enviar →' : 'Revisar →'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desglose por estado */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-600">
          Mis solicitudes por estado
        </h2>
        <div className="flex flex-wrap gap-3">
          {ESTADOS.map((e) => (
            <div
              key={e}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
            >
              <EstadoBadge estado={e} />
              <span className="text-lg font-bold">{pe?.[e] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recientes */}
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Solicitudes recientes</h2>
            <Link
              to="/solicitudes"
              className="text-sm text-marca-600 hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {recientes.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                No hay solicitudes todavía.
              </p>
            ) : (
              <ul className="divide-y">
                {recientes.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/solicitudes/${s.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {s.tipo_permiso_nombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          {s.docente_nombre} {s.docente_apellido} ·{' '}
                          {formatFecha(s.fecha_inicio)} – {formatFecha(s.fecha_fin)}
                        </p>
                      </div>
                      <EstadoBadge estado={s.estado} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div>
          <h2 className="mb-2 text-lg font-semibold">Accesos rápidos</h2>
          <div className="space-y-2">
            <Acceso to="/solicitudes/nueva" texto="➕ Nueva solicitud" />
            <Acceso to="/solicitudes" texto="📋 Mis solicitudes" />
            {tieneRol('TALENTO_HUMANO', 'ADMIN') && (
              <Acceso to="/reportes" texto="📊 Reportes" />
            )}
            {tieneRol('ADMIN') && (
              <>
                <Acceso to="/usuarios" texto="👥 Usuarios" />
                <Acceso to="/tipos-permiso" texto="🗂️ Tipos de permiso" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  color = 'text-slate-800',
  destacar = false,
}: {
  titulo: string;
  valor: number;
  color?: string;
  destacar?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        destacar && valor > 0
          ? 'border-amber-300 ring-1 ring-amber-200'
          : 'border-slate-200'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{valor}</p>
    </div>
  );
}

function Acceso({ to, texto }: { to: string; texto: string }) {
  return (
    <Link
      to={to}
      className="block rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50"
    >
      {texto}
    </Link>
  );
}
