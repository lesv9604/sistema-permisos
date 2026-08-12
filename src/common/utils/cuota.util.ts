import { UnidadTiempo } from '../enums/unidad-tiempo.enum';

/** Equivalencia de la regla de negocio: 1 día = 8 horas. */
export const HORAS_POR_DIA = 8;

/** Pequeño margen para evitar falsos positivos por aritmética de coma flotante. */
const EPSILON = 1e-9;

/** Convierte una cantidad de tiempo a días (las horas se dividen entre 8). */
export function aDias(unidad: UnidadTiempo, cantidad: number): number {
  return unidad === UnidadTiempo.HORAS ? cantidad / HORAS_POR_DIA : cantidad;
}

/** Suma, en días, el tiempo de un conjunto de solicitudes. */
export function calcularConsumoDias(
  filas: { unidad_tiempo: UnidadTiempo; cantidad_tiempo: number }[],
): number {
  return filas.reduce(
    (acc, f) => acc + aDias(f.unidad_tiempo, Number(f.cantidad_tiempo)),
    0,
  );
}

/** ¿La suma de lo consumido más lo nuevo supera el límite anual (en días)? */
export function excedeCuota(
  consumidoDias: number,
  nuevoDias: number,
  maxDias: number,
): boolean {
  return consumidoDias + nuevoDias > maxDias + EPSILON;
}
