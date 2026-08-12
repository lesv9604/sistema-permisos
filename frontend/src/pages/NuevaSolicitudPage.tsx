import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { mensajeError } from '../lib/api';
import {
  crearSolicitud,
  obtenerCuota,
  type CrearSolicitudInput,
} from '../services/permisos';
import { listarTipos } from '../services/tipos';

export function NuevaSolicitudPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo_permiso_id: '',
    unidad_tiempo: 'DIAS',
    cantidad_tiempo: '',
    hora_inicio: '',
    hora_fin: '',
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
    observaciones: '',
    documento_soporte: '',
  });

  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos', { activos: true }],
    queryFn: () => listarTipos(true),
  });

  const tipoId = Number(form.tipo_permiso_id);
  const tipoSeleccionado = tipos.find((t) => t.id === tipoId);

  const { data: cuota } = useQuery({
    queryKey: ['cuota', tipoId],
    queryFn: () => obtenerCuota(tipoId),
    enabled: tipoId > 0,
  });

  const crear = useMutation({
    mutationFn: (input: CrearSolicitudInput) => crearSolicitud(input),
    onSuccess: (s) => navigate(`/solicitudes/${s.id}`),
    onError: (e) => setError(mensajeError(e)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    crear.mutate({
      tipo_permiso_id: Number(form.tipo_permiso_id),
      unidad_tiempo: form.unidad_tiempo === 'HORAS' ? 'HORAS' : 'DIAS',
      cantidad_tiempo:
        form.unidad_tiempo === 'HORAS' && form.cantidad_tiempo
          ? Number(form.cantidad_tiempo)
          : undefined,
      hora_inicio:
        form.unidad_tiempo === 'HORAS' ? form.hora_inicio || undefined : undefined,
      hora_fin:
        form.unidad_tiempo === 'HORAS' ? form.hora_fin || undefined : undefined,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      motivo: form.motivo || undefined,
      observaciones: form.observaciones || undefined,
      documento_soporte: form.documento_soporte || undefined,
    });
  };

  const set = (campo: string, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Nueva solicitud de permiso</h1>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">
            Tipo de permiso
          </label>
          <select
            required
            value={form.tipo_permiso_id}
            onChange={(e) => set('tipo_permiso_id', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecciona…</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          {tipoSeleccionado?.requiere_soporte && (
            <p className="mt-1 text-xs text-amber-600">
              Este tipo de permiso requiere documento de soporte.
            </p>
          )}
          {cuota && cuota.max !== null && (
            <p className="mt-1 text-xs text-slate-600">
              Cuota anual: <strong>{cuota.disponible}</strong> de {cuota.max}{' '}
              día(s) disponibles
              {cuota.consumido > 0 ? ` (ya usaste ${cuota.consumido})` : ''}.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Unidad de tiempo
            </label>
            <select
              value={form.unidad_tiempo}
              onChange={(e) => set('unidad_tiempo', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="DIAS">Días (días hábiles entre fechas)</option>
              <option value="HORAS">Horas</option>
            </select>
          </div>
          {form.unidad_tiempo === 'HORAS' && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Cantidad de horas
              </label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                required
                value={form.cantidad_tiempo}
                onChange={(e) => set('cantidad_tiempo', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        {/* Horas de inicio/fin: solo para permisos por HORAS. */}
        {form.unidad_tiempo === 'HORAS' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Hora de inicio
              </label>
              <input
                type="time"
                required
                value={form.hora_inicio}
                onChange={(e) => set('hora_inicio', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Hora de fin
              </label>
              <input
                type="time"
                required
                value={form.hora_fin}
                onChange={(e) => set('hora_fin', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Fecha de inicio
            </label>
            <input
              type="date"
              required
              value={form.fecha_inicio}
              onChange={(e) => set('fecha_inicio', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Fecha de fin
            </label>
            <input
              type="date"
              required
              value={form.fecha_fin}
              onChange={(e) => set('fecha_fin', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Motivo</label>
          <textarea
            value={form.motivo}
            onChange={(e) => set('motivo', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Describe el motivo del permiso…"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Documento de soporte (URL)
          </label>
          <input
            type="url"
            value={form.documento_soporte}
            onChange={(e) => set('documento_soporte', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="https://…"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/solicitudes')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={crear.isPending}
            className="rounded-md bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700 disabled:opacity-60"
          >
            {crear.isPending ? 'Creando…' : 'Crear borrador'}
          </button>
        </div>
      </form>
      <p className="mt-2 text-xs text-slate-500">
        La solicitud se crea en estado <strong>Borrador</strong>. En modo{' '}
        <strong>Días</strong>, los días hábiles se calculan automáticamente
        entre las fechas; en modo <strong>Horas</strong>, se usa la cantidad
        indicada.
      </p>
    </div>
  );
}
