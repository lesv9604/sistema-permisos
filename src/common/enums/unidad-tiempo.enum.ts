/**
 * Unidad de tiempo de un permiso. Coincide con el enum nativo `unidad_tiempo`
 * de PostgreSQL. Un DIA equivale a 8 horas (regla de negocio a aplicar luego).
 */
export enum UnidadTiempo {
  DIAS = 'DIAS',
  HORAS = 'HORAS',
}
