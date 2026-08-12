/**
 * Fila de la tabla `tipos_permiso`.
 */
export interface TipoPermiso {
  id: number;
  nombre: string;
  descripcion: string | null;
  requiere_soporte: boolean;
  max_dias_anuales: number | null;
  con_remuneracion: boolean;
  activo: boolean;
}
