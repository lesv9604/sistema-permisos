import { EstadoSolicitud } from '../../common/enums/estado-solicitud.enum';
import { UnidadTiempo } from '../../common/enums/unidad-tiempo.enum';

/**
 * Fila de la tabla `solicitudes_permiso`.
 */
export interface SolicitudPermiso {
  id: string;
  docente_id: string;
  tipo_permiso_id: number;
  estado: EstadoSolicitud;
  fecha_inicio: string;
  fecha_fin: string;
  unidad_tiempo: UnidadTiempo;
  cantidad_tiempo: number;
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string | null;
  observaciones: string | null;
  docente_sustituto_id: string | null;
  plan_trabajo_adjunto: string | null;
  documento_soporte: string | null;
  created_at: Date;
  updated_at: Date;
  submitted_at: Date | null;
}
