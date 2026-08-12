export type Rol =
  | 'DOCENTE'
  | 'JEFE_INMEDIATO'
  | 'JEFE_ESCUELA'
  | 'TALENTO_HUMANO'
  | 'ADMIN';

export type EstadoSolicitud =
  | 'BORRADOR'
  | 'PENDIENTE_JEFE_ESCUELA'
  | 'PENDIENTE_JEFE_INMEDIATO'
  | 'PENDIENTE_TALENTO_HUMANO'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'CANCELADA';

export type UnidadTiempo = 'DIAS' | 'HORAS';

export interface UsuarioPublico {
  id: string;
  rol: Rol;
  jefe_id: string | null;
  jefe_escuela_id: string | null;
  nombre: string;
  apellido: string;
  email: string;
  cedula: string;
  escuela: string | null;
  dependencia: string | null;
  cargo: string | null;
  activo: boolean;
}

export interface TipoPermiso {
  id: number;
  nombre: string;
  descripcion: string | null;
  requiere_soporte: boolean;
  max_dias_anuales: number | null;
  con_remuneracion: boolean;
  activo: boolean;
}

export interface Solicitud {
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
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  tipo_permiso_nombre: string;
  docente_nombre: string;
  docente_apellido: string;
}

export interface HistorialEntrada {
  id: number;
  solicitud_id: string;
  usuario_id: string;
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  comentario: string | null;
  ip_address: string | null;
  created_at: string;
  usuario_nombre: string;
  usuario_apellido: string;
}

export interface Notificacion {
  id: number;
  usuario_id: string;
  solicitud_id: string | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

export interface RespuestaApi<T> {
  data: T;
  message: string;
}

export interface SesionData {
  usuario: UsuarioPublico;
  access_token: string;
  refresh_token: string;
}
