import { BadRequestException } from '@nestjs/common';
import Papa from 'papaparse';

/** Cabeceras esperadas (y plantilla) del CSV de carga masiva de usuarios. */
export const CABECERAS_CSV = [
  'nombre',
  'apellido',
  'email',
  'cedula',
  'escuela',
  'dependencia',
  'cargo',
  'rol',
  'email_jefe_inmediato',
  'email_jefe_escuela',
] as const;

const CABECERAS_OBLIGATORIAS = [
  'nombre',
  'apellido',
  'email',
  'cedula',
  'rol',
] as const;

export interface FilaUsuarioCsv {
  nombre: string;
  apellido: string;
  email: string;
  cedula: string;
  escuela?: string;
  dependencia?: string;
  cargo?: string;
  rol: string;
  email_jefe_inmediato?: string;
  email_jefe_escuela?: string;
}

/**
 * Fila validada y lista para la Fase 1 (inserción base). NO incluye los UUID
 * de los jefes: solo arrastra sus EMAILS, que se resuelven en la Fase 2 una vez
 * que todos los usuarios del CSV ya existen en la base de datos.
 */
export interface UsuarioPreparado {
  rol_id: number;
  nombre: string;
  apellido: string;
  email: string;
  cedula: string;
  escuela: string | null;
  dependencia: string | null;
  cargo: string | null;
  email_jefe_inmediato: string | null;
  email_jefe_escuela: string | null;
}

export interface ContextoCarga {
  /** nombre de rol → rol_id */
  rolesPorNombre: Map<string, number>;
  /** emails existentes (minúsculas) */
  emailsExistentes: Set<string>;
  /** cédulas existentes */
  cedulasExistentes: Set<string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parsea el contenido CSV a filas tipadas. Lanza si faltan cabeceras
 * obligatorias o si el archivo no tiene filas de datos.
 */
export function parsearCsvUsuarios(contenido: string): FilaUsuarioCsv[] {
  const resultado = Papa.parse<Record<string, string>>(contenido.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const cabeceras = resultado.meta.fields ?? [];
  const faltantes = CABECERAS_OBLIGATORIAS.filter(
    (c) => !cabeceras.includes(c),
  );
  if (faltantes.length > 0) {
    throw new BadRequestException(
      `El CSV no tiene las columnas obligatorias: ${faltantes.join(', ')}.`,
    );
  }

  const filas = resultado.data.map((r) => normalizarFila(r));
  if (filas.length === 0) {
    throw new BadRequestException('El CSV no contiene filas de datos.');
  }
  return filas;
}

function normalizarFila(r: Record<string, string>): FilaUsuarioCsv {
  const v = (k: string): string => (r[k] ?? '').trim();
  return {
    nombre: v('nombre'),
    apellido: v('apellido'),
    email: v('email'),
    cedula: v('cedula'),
    escuela: v('escuela') || undefined,
    dependencia: v('dependencia') || undefined,
    cargo: v('cargo') || undefined,
    rol: v('rol'),
    email_jefe_inmediato: v('email_jefe_inmediato') || undefined,
    email_jefe_escuela: v('email_jefe_escuela') || undefined,
  };
}

/**
 * Valida cada fila y la deja lista para la Fase 1 (inserción base). Valida
 * campos obligatorios, formato de email, rol y unicidad (contra la BD y dentro
 * del propio CSV). NO resuelve los jefes: arrastra sus emails para la Fase 2.
 * Si una fila es inválida, lanza `BadRequestException` con el número de fila
 * (1 = cabecera).
 *
 * Función PURA: no realiza IO; recibe todo el contexto ya consultado.
 */
export function prepararUsuarios(
  filas: FilaUsuarioCsv[],
  ctx: ContextoCarga,
): UsuarioPreparado[] {
  const emailsVistos = new Set<string>();
  const cedulasVistas = new Set<string>();
  const preparados: UsuarioPreparado[] = [];

  filas.forEach((fila, i) => {
    const nFila = i + 2; // +1 por cabecera, +1 para que sea 1-based
    const error = (msg: string): never => {
      throw new BadRequestException(`Fila ${nFila}: ${msg}`);
    };

    if (!fila.nombre) error('falta el nombre.');
    if (!fila.apellido) error('falta el apellido.');
    if (!fila.email) error('falta el email.');
    if (!fila.cedula) error('falta la cédula.');

    const email = fila.email.toLowerCase();
    if (!EMAIL_RE.test(email)) error(`el email "${fila.email}" no es válido.`);

    const rolId = ctx.rolesPorNombre.get(fila.rol.toUpperCase());
    if (rolId === undefined) error(`el rol "${fila.rol}" no es válido.`);

    if (ctx.emailsExistentes.has(email) || emailsVistos.has(email)) {
      error(`el email "${fila.email}" ya existe.`);
    }
    if (ctx.cedulasExistentes.has(fila.cedula) || cedulasVistas.has(fila.cedula)) {
      error(`la cédula "${fila.cedula}" ya existe.`);
    }

    emailsVistos.add(email);
    cedulasVistas.add(fila.cedula);

    preparados.push({
      rol_id: rolId as number,
      nombre: fila.nombre,
      apellido: fila.apellido,
      email,
      cedula: fila.cedula,
      escuela: fila.escuela ?? null,
      dependencia: fila.dependencia ?? null,
      cargo: fila.cargo ?? null,
      email_jefe_inmediato: fila.email_jefe_inmediato?.toLowerCase() ?? null,
      email_jefe_escuela: fila.email_jefe_escuela?.toLowerCase() ?? null,
    });
  });

  return preparados;
}
