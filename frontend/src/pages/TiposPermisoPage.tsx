import { useState, type FormEvent } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { mensajeError } from '../lib/api';
import {
  actualizarTipo,
  crearTipo,
  desactivarTipo,
  listarTipos,
  type TipoPermisoInput,
} from '../services/tipos';

export function TiposPermisoPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    requiere_soporte: false,
    con_remuneracion: true,
    max_dias_anuales: '',
  });

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ['tipos', { activos: false }],
    queryFn: () => listarTipos(false),
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['tipos'] });

  const crear = useMutation({
    mutationFn: (input: TipoPermisoInput) => crearTipo(input),
    onSuccess: () => {
      setError(null);
      setForm({
        nombre: '',
        descripcion: '',
        requiere_soporte: false,
        con_remuneracion: true,
        max_dias_anuales: '',
      });
      invalidar();
    },
    onError: (e) => setError(mensajeError(e)),
  });

  const cambiarActivo = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      activo ? actualizarTipo(id, { activo: true }) : desactivarTipo(id),
    onSuccess: invalidar,
    onError: (e) => setError(mensajeError(e)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    crear.mutate({
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      requiere_soporte: form.requiere_soporte,
      con_remuneracion: form.con_remuneracion,
      max_dias_anuales: form.max_dias_anuales
        ? Number(form.max_dias_anuales)
        : undefined,
    });
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Tipos de permiso</h1>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Nombre</label>
          <input
            required
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Descripción</label>
          <input
            value={form.descripcion}
            onChange={(e) =>
              setForm((f) => ({ ...f, descripcion: e.target.value }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Máx. días anuales
          </label>
          <input
            type="number"
            min={0}
            value={form.max_dias_anuales}
            onChange={(e) =>
              setForm((f) => ({ ...f, max_dias_anuales: e.target.value }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.requiere_soporte}
              onChange={(e) =>
                setForm((f) => ({ ...f, requiere_soporte: e.target.checked }))
              }
            />
            Requiere soporte
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.con_remuneracion}
              onChange={(e) =>
                setForm((f) => ({ ...f, con_remuneracion: e.target.checked }))
              }
            />
            Con remuneración
          </label>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={crear.isPending}
            className="rounded-md bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700 disabled:opacity-60"
          >
            {crear.isPending ? 'Creando…' : 'Crear tipo'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Soporte</th>
              <th className="px-4 py-2">Remunerado</th>
              <th className="px-4 py-2">Máx. días</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            ) : (
              tipos.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{t.nombre}</td>
                  <td className="px-4 py-2">{t.requiere_soporte ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-2">
                    {t.con_remuneracion ? 'Sí' : 'No'}
                  </td>
                  <td className="px-4 py-2">{t.max_dias_anuales ?? '—'}</td>
                  <td className="px-4 py-2">
                    {t.activo ? (
                      <span className="text-green-600">Activo</span>
                    ) : (
                      <span className="text-slate-400">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() =>
                        cambiarActivo.mutate({ id: t.id, activo: !t.activo })
                      }
                      className="text-marca-600 hover:underline"
                    >
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </button>
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
