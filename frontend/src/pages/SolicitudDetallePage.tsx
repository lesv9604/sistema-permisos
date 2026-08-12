import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '../auth/auth-context';
import { EstadoBadge } from '../components/EstadoBadge';
import { ProgresoSolicitud } from '../components/ProgresoSolicitud';
import { mensajeError } from '../lib/api';
import { formatFecha, formatFechaHora, formatTiempo } from '../lib/ui';
import {
  ejecutarAccion,
  eliminarSolicitud,
  obtenerHistorial,
  obtenerSolicitud,
  type AccionFlujo,
} from '../services/permisos';

export function SolicitudDetallePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [comentario, setComentario] = useState('');

  const { data: solicitud, isLoading } = useQuery({
    queryKey: ['solicitud', id],
    queryFn: () => obtenerSolicitud(id),
  });
  const { data: historial = [] } = useQuery({
    queryKey: ['historial', id],
    queryFn: () => obtenerHistorial(id),
    enabled: !!solicitud,
  });

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ['solicitud', id] });
    void qc.invalidateQueries({ queryKey: ['historial', id] });
    void qc.invalidateQueries({ queryKey: ['solicitudes'] });
    void qc.invalidateQueries({ queryKey: ['notificaciones'] });
  };

  const accion = useMutation({
    mutationFn: ({ acc, com }: { acc: AccionFlujo; com?: string }) =>
      ejecutarAccion(id, acc, com),
    onSuccess: () => {
      setError(null);
      setMostrarRechazo(false);
      setComentario('');
      invalidar();
    },
    onError: (e) => setError(mensajeError(e)),
  });

  const borrar = useMutation({
    mutationFn: () => eliminarSolicitud(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['solicitudes'] });
      navigate('/solicitudes');
    },
    onError: (e) => setError(mensajeError(e)),
  });

  if (isLoading || !solicitud || !usuario) {
    return <p className="text-slate-400">Cargando…</p>;
  }

  const esDueno = solicitud.docente_id === usuario.id;
  const esAdmin = usuario.rol === 'ADMIN';
  const puedeEnviar = esDueno && solicitud.estado === 'BORRADOR';
  const puedeBorrar = esDueno && solicitud.estado === 'BORRADOR';
  const puedeCancelar =
    esDueno &&
    [
      'BORRADOR',
      'PENDIENTE_JEFE_ESCUELA',
      'PENDIENTE_JEFE_INMEDIATO',
      'PENDIENTE_TALENTO_HUMANO',
    ].includes(solicitud.estado);
  // El backend valida que sea el jefe concreto del docente; aquí mostramos los
  // botones según el rol y el estado (pista de UI; la autoridad final es del servidor).
  const puedeAprobarEscuela =
    solicitud.estado === 'PENDIENTE_JEFE_ESCUELA' &&
    (usuario.rol === 'JEFE_ESCUELA' || esAdmin);
  const puedeAprobarInmediato =
    solicitud.estado === 'PENDIENTE_JEFE_INMEDIATO' &&
    (usuario.rol === 'JEFE_INMEDIATO' || esAdmin);
  const puedeAprobarTH =
    solicitud.estado === 'PENDIENTE_TALENTO_HUMANO' &&
    (usuario.rol === 'TALENTO_HUMANO' || esAdmin);
  const puedeDecidir =
    puedeAprobarEscuela || puedeAprobarInmediato || puedeAprobarTH;

  const Campo = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">
        {etiqueta}
      </dt>
      <dd className="text-sm">{valor || '—'}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate('/solicitudes')}
        className="mb-3 text-sm text-marca-600 hover:underline"
      >
        ← Volver al listado
      </button>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{solicitud.tipo_permiso_nombre}</h1>
            <p className="text-sm text-slate-500">
              {solicitud.docente_nombre} {solicitud.docente_apellido}
            </p>
          </div>
          <EstadoBadge estado={solicitud.estado} />
        </div>

        <div className="mb-6">
          <ProgresoSolicitud estado={solicitud.estado} />
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Campo etiqueta="Desde" valor={formatFecha(solicitud.fecha_inicio)} />
          <Campo etiqueta="Hasta" valor={formatFecha(solicitud.fecha_fin)} />
          <Campo
            etiqueta="Tiempo"
            valor={formatTiempo(solicitud.unidad_tiempo, solicitud.cantidad_tiempo)}
          />
          <Campo etiqueta="Motivo" valor={solicitud.motivo ?? ''} />
          <Campo
            etiqueta="Observaciones"
            valor={solicitud.observaciones ?? ''}
          />
          <Campo
            etiqueta="Soporte"
            valor={solicitud.documento_soporte ?? ''}
          />
        </dl>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Acciones */}
        <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
          {puedeEnviar && (
            <button
              onClick={() => accion.mutate({ acc: 'enviar' })}
              disabled={accion.isPending}
              className="rounded-md bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700 disabled:opacity-60"
            >
              Enviar a aprobación
            </button>
          )}
          {puedeDecidir && !mostrarRechazo && (
            <>
              <button
                onClick={() => accion.mutate({ acc: 'aprobar' })}
                disabled={accion.isPending}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                Aprobar
              </button>
              <button
                onClick={() => setMostrarRechazo(true)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Rechazar
              </button>
            </>
          )}
          {puedeCancelar && (
            <button
              onClick={() => accion.mutate({ acc: 'cancelar' })}
              disabled={accion.isPending}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
            >
              Cancelar solicitud
            </button>
          )}
          {puedeBorrar && (
            <button
              onClick={() => borrar.mutate()}
              disabled={borrar.isPending}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Eliminar borrador
            </button>
          )}
        </div>

        {/* Formulario de rechazo (comentario obligatorio) */}
        {mostrarRechazo && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
            <label className="mb-1 block text-sm font-medium">
              Motivo del rechazo (obligatorio)
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() =>
                  accion.mutate({ acc: 'rechazar', com: comentario })
                }
                disabled={accion.isPending || comentario.trim().length < 3}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar rechazo
              </button>
              <button
                onClick={() => {
                  setMostrarRechazo(false);
                  setComentario('');
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Historial</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-slate-400">Sin movimientos todavía.</p>
        ) : (
          <ol className="space-y-4">
            {historial.map((h) => (
              <li key={h.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-marca-500" />
                <div>
                  <p className="text-sm font-medium">
                    {h.accion.replaceAll('_', ' ')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {h.usuario_nombre} {h.usuario_apellido} ·{' '}
                    {formatFechaHora(h.created_at)}
                  </p>
                  {h.estado_anterior && (
                    <p className="text-xs text-slate-400">
                      {h.estado_anterior} → {h.estado_nuevo}
                    </p>
                  )}
                  {h.comentario && (
                    <p className="mt-1 text-sm italic text-slate-600">
                      “{h.comentario}”
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
