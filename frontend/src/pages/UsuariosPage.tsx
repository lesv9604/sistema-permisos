import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { mensajeError } from '../lib/api';
import { ROL_TEXTO } from '../lib/ui';
import {
  actualizarUsuario,
  cargaMasivaUsuarios,
  crearUsuario,
  desactivarUsuario,
  listarUsuarios,
  type ActualizarUsuarioInput,
  type CrearUsuarioInput,
} from '../services/usuarios';
import type { Rol, UsuarioPublico } from '../types';

const ROLES: Rol[] = [
  'DOCENTE',
  'JEFE_INMEDIATO',
  'JEFE_ESCUELA',
  'TALENTO_HUMANO',
  'ADMIN',
];

/** Cabeceras del CSV de carga masiva (deben coincidir con el backend). */
const CABECERAS_CSV =
  'nombre,apellido,email,cedula,escuela,dependencia,cargo,rol,email_jefe_inmediato,email_jefe_escuela';

const FORM_VACIO = {
  rol: 'DOCENTE' as string,
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  cedula: '',
  escuela: '',
  dependencia: '',
  cargo: '',
  jefe_id: '',
  jefe_escuela_id: '',
};

export function UsuariosPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [editando, setEditando] = useState<UsuarioPublico | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => listarUsuarios(),
  });

  // Posibles jefes inmediatos: jefes inmediatos y administradores activos.
  const jefes = useMemo(
    () =>
      usuarios.filter(
        (u) =>
          (u.rol === 'JEFE_INMEDIATO' || u.rol === 'ADMIN') && u.activo,
      ),
    [usuarios],
  );
  // Posibles jefes de escuela: usuarios con rol JEFE_ESCUELA activos.
  const jefesEscuela = useMemo(
    () => usuarios.filter((u) => u.rol === 'JEFE_ESCUELA' && u.activo),
    [usuarios],
  );
  const nombreJefe = (id: string | null) => {
    if (!id) return '—';
    const j = usuarios.find((u) => u.id === id);
    return j ? `${j.nombre} ${j.apellido}` : '—';
  };

  const invalidar = () => qc.invalidateQueries({ queryKey: ['usuarios'] });

  const crear = useMutation({
    mutationFn: (input: CrearUsuarioInput) => crearUsuario(input),
    onSuccess: () => {
      setError(null);
      setForm(FORM_VACIO);
      invalidar();
    },
    onError: (e) => setError(mensajeError(e)),
  });

  const actualizar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ActualizarUsuarioInput }) =>
      actualizarUsuario(id, input),
    onSuccess: () => {
      setEditando(null);
      invalidar();
    },
    onError: (e) => setError(mensajeError(e)),
  });

  const cambiarActivo = useMutation({
    mutationFn: ({ u }: { u: UsuarioPublico }) =>
      u.activo
        ? desactivarUsuario(u.id)
        : actualizarUsuario(u.id, { activo: true }),
    onSuccess: invalidar,
    onError: (e) => setError(mensajeError(e)),
  });

  const cargaMasiva = useMutation({
    mutationFn: (archivo: File) => cargaMasivaUsuarios(archivo),
    onSuccess: (r) => {
      setError(null);
      setAviso(r.message);
      invalidar();
    },
    onError: (e) => {
      setAviso(null);
      setError(mensajeError(e));
    },
  });

  const onCrear = (e: FormEvent) => {
    e.preventDefault();
    crear.mutate({
      rol: form.rol as Rol,
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
      password: form.password,
      cedula: form.cedula,
      escuela: form.escuela || undefined,
      dependencia: form.dependencia || undefined,
      cargo: form.cargo || undefined,
      jefe_id: form.jefe_id || undefined,
      jefe_escuela_id: form.jefe_escuela_id || undefined,
    });
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const descargarPlantilla = () => {
    const ejemplo =
      'Ana,Pérez,ana.perez@colegio.edu,12345678,Ciencias,Vicerrectoría,Docente,DOCENTE,' +
      'jefe.inmediato@colegio.edu,jefe.escuela@colegio.edu';
    const blob = new Blob(['﻿' + `${CABECERAS_CSV}\n${ejemplo}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-usuarios.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onArchivo = (e: FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a subir el mismo archivo
    if (archivo) {
      setError(null);
      setAviso(null);
      cargaMasiva.mutate(archivo);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <div className="flex gap-2">
          <button
            onClick={descargarPlantilla}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          >
            ⬇ Descargar plantilla CSV
          </button>
          <button
            onClick={() => inputArchivo.current?.click()}
            disabled={cargaMasiva.isPending}
            className="rounded-md bg-marca-600 px-3 py-2 text-sm font-semibold text-white hover:bg-marca-700 disabled:opacity-60"
          >
            {cargaMasiva.isPending ? 'Subiendo…' : '⬆ Subir CSV'}
          </button>
          <input
            ref={inputArchivo}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onArchivo}
          />
        </div>
      </div>

      {aviso && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {aviso}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Crear */}
      <form
        onSubmit={onCrear}
        className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-3"
      >
        <h2 className="sm:col-span-3 text-lg font-semibold">Crear usuario</h2>
        <Campo label="Nombre">
          <input
            required
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Apellido">
          <input
            required
            value={form.apellido}
            onChange={(e) => set('apellido', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Rol">
          <select
            value={form.rol}
            onChange={(e) => set('rol', e.target.value)}
            className="entrada"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROL_TEXTO[r]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Email">
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Contraseña (mín. 8)">
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Cédula">
          <input
            required
            value={form.cedula}
            onChange={(e) => set('cedula', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Escuela">
          <input
            value={form.escuela}
            onChange={(e) => set('escuela', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Dependencia">
          <input
            value={form.dependencia}
            onChange={(e) => set('dependencia', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Cargo">
          <input
            value={form.cargo}
            onChange={(e) => set('cargo', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Jefe inmediato">
          <select
            value={form.jefe_id}
            onChange={(e) => set('jefe_id', e.target.value)}
            className="entrada"
          >
            <option value="">(ninguno)</option>
            {jefes.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nombre} {j.apellido}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Jefe de Escuela">
          <select
            value={form.jefe_escuela_id}
            onChange={(e) => set('jefe_escuela_id', e.target.value)}
            className="entrada"
          >
            <option value="">(ninguno)</option>
            {jefesEscuela.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nombre} {j.apellido}
              </option>
            ))}
          </select>
        </Campo>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={crear.isPending}
            className="rounded-md bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700 disabled:opacity-60"
          >
            {crear.isPending ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>

      {/* Lista */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Jefe inmediato</th>
              <th className="px-4 py-2">Jefe de Escuela</th>
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
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    {u.nombre} {u.apellido}
                  </td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{ROL_TEXTO[u.rol]}</td>
                  <td className="px-4 py-2">{nombreJefe(u.jefe_id)}</td>
                  <td className="px-4 py-2">{nombreJefe(u.jefe_escuela_id)}</td>
                  <td className="px-4 py-2">
                    {u.activo ? (
                      <span className="text-green-600">Activo</span>
                    ) : (
                      <span className="text-slate-400">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setEditando(u)}
                      className="mr-3 text-marca-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => cambiarActivo.mutate({ u })}
                      className="text-slate-500 hover:underline"
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editando && (
        <EditarUsuarioModal
          usuario={editando}
          jefes={jefes}
          jefesEscuela={jefesEscuela}
          guardando={actualizar.isPending}
          onGuardar={(input) =>
            actualizar.mutate({ id: editando.id, input })
          }
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function EditarUsuarioModal({
  usuario,
  jefes,
  jefesEscuela,
  guardando,
  onGuardar,
  onCerrar,
}: {
  usuario: UsuarioPublico;
  jefes: UsuarioPublico[];
  jefesEscuela: UsuarioPublico[];
  guardando: boolean;
  onGuardar: (input: ActualizarUsuarioInput) => void;
  onCerrar: () => void;
}) {
  const [campos, setCampos] = useState({
    rol: usuario.rol as string,
    escuela: usuario.escuela ?? '',
    dependencia: usuario.dependencia ?? '',
    cargo: usuario.cargo ?? '',
    jefe_id: usuario.jefe_id ?? '',
    jefe_escuela_id: usuario.jefe_escuela_id ?? '',
    password: '',
  });
  const set = (k: string, v: string) =>
    setCampos((c) => ({ ...c, [k]: v }));

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    const input: ActualizarUsuarioInput = {
      rol: campos.rol as Rol,
      escuela: campos.escuela || undefined,
      dependencia: campos.dependencia || undefined,
      cargo: campos.cargo || undefined,
      jefe_id: campos.jefe_id ? campos.jefe_id : null,
      jefe_escuela_id: campos.jefe_escuela_id ? campos.jefe_escuela_id : null,
    };
    if (campos.password) input.password = campos.password;
    onGuardar(input);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={guardar}
        className="w-full max-w-md space-y-3 rounded-lg bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold">
          Editar: {usuario.nombre} {usuario.apellido}
        </h3>
        <Campo label="Rol">
          <select
            value={campos.rol}
            onChange={(e) => set('rol', e.target.value)}
            className="entrada"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROL_TEXTO[r]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Escuela">
          <input
            value={campos.escuela}
            onChange={(e) => set('escuela', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Dependencia">
          <input
            value={campos.dependencia}
            onChange={(e) => set('dependencia', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Cargo">
          <input
            value={campos.cargo}
            onChange={(e) => set('cargo', e.target.value)}
            className="entrada"
          />
        </Campo>
        <Campo label="Jefe inmediato">
          <select
            value={campos.jefe_id}
            onChange={(e) => set('jefe_id', e.target.value)}
            className="entrada"
          >
            <option value="">(ninguno)</option>
            {jefes
              .filter((j) => j.id !== usuario.id)
              .map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre} {j.apellido}
                </option>
              ))}
          </select>
        </Campo>
        <Campo label="Jefe de Escuela">
          <select
            value={campos.jefe_escuela_id}
            onChange={(e) => set('jefe_escuela_id', e.target.value)}
            className="entrada"
          >
            <option value="">(ninguno)</option>
            {jefesEscuela
              .filter((j) => j.id !== usuario.id)
              .map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre} {j.apellido}
                </option>
              ))}
          </select>
        </Campo>
        <Campo label="Nueva contraseña (opcional)">
          <input
            type="password"
            value={campos.password}
            onChange={(e) => set('password', e.target.value)}
            className="entrada"
            placeholder="Dejar vacío para no cambiar"
          />
        </Campo>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-md bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700 disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
