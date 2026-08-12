/**
 * Tipos de notificación in-app emitidos por el flujo de aprobación.
 */
export enum TipoNotificacion {
  SOLICITUD_PENDIENTE = 'SOLICITUD_PENDIENTE',
  SOLICITUD_APROBADA = 'SOLICITUD_APROBADA',
  SOLICITUD_RECHAZADA = 'SOLICITUD_RECHAZADA',
  SOLICITUD_CANCELADA = 'SOLICITUD_CANCELADA',
  SOLICITUD_AVANZA = 'SOLICITUD_AVANZA',
}

/** Fila de la tabla `notificaciones`. */
export interface Notificacion {
  id: number;
  usuario_id: string;
  solicitud_id: string | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: Date;
}

/** Datos para crear una notificación. */
export interface NuevaNotificacion {
  usuario_id: string;
  solicitud_id?: string | null;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
}
