/**
 * Fila de `historial_aprobaciones`. Tabla INMUTABLE: solo se hacen INSERT,
 * nunca UPDATE ni DELETE (regla del CLAUDE.md).
 */
export interface HistorialAprobacion {
  id: number;
  solicitud_id: string;
  usuario_id: string;
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  comentario: string | null;
  ip_address: string | null;
  created_at: Date;
}

/** Datos necesarios para registrar una entrada de historial. */
export type NuevoHistorial = Omit<HistorialAprobacion, 'id' | 'created_at'>;

/** Historial con el nombre del usuario que ejecutó la acción (para lectura). */
export interface HistorialConUsuario extends HistorialAprobacion {
  usuario_nombre: string;
  usuario_apellido: string;
}
