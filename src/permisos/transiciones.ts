import { Rol } from '../common/enums/rol.enum';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum';

/**
 * Acciones que un usuario puede solicitar sobre una solicitud. El estado
 * destino de APROBAR/ENVIAR puede ser dinámico (depende de la jerarquía del
 * docente y de la regla de "misma persona").
 */
export enum TipoAccion {
  ENVIAR = 'ENVIAR',
  APROBAR = 'APROBAR',
  RECHAZAR = 'RECHAZAR',
  CANCELAR = 'CANCELAR',
}

/** Jerarquía del docente dueño de la solicitud, necesaria para resolver destinos. */
export interface ContextoJerarquia {
  jefe_id: string | null;
  jefe_escuela_id: string | null;
}

export type ResolverDestino =
  | EstadoSolicitud
  | ((ctx: ContextoJerarquia) => EstadoSolicitud);

export interface DefinicionTransicion {
  accion: TipoAccion;
  estadoOrigen: EstadoSolicitud;
  /** Estado destino fijo o función que lo calcula según la jerarquía. */
  destino: ResolverDestino;
  /** Etiqueta persistida en `historial_aprobaciones.accion`. */
  etiqueta: string;
  /** Debe ser el docente dueño (enviar/cancelar). */
  requiereSerDueno: boolean;
  /** Debe ser el Jefe de Escuela del docente (salvo ADMIN). */
  requiereSerJefeEscuela: boolean;
  /** Debe ser el Jefe Inmediato del docente (salvo ADMIN). */
  requiereSerJefeInmediato: boolean;
  /** Roles autorizados (p. ej. TH). Vacío = no se exige un rol concreto. */
  rolesPermitidos: Rol[];
  /** Exige comentario obligatorio (rechazos). */
  requiereComentario: boolean;
}

const TODOS_LOS_ROLES: Rol[] = [
  Rol.DOCENTE,
  Rol.JEFE_INMEDIATO,
  Rol.JEFE_ESCUELA,
  Rol.TALENTO_HUMANO,
  Rol.ADMIN,
];

/**
 * Al ENVIAR, el primer destino depende de la jerarquía disponible:
 * Jefe de Escuela → Jefe Inmediato → Talento Humano (respaldo si faltan jefes).
 */
const destinoEnvio = (ctx: ContextoJerarquia): EstadoSolicitud => {
  if (ctx.jefe_escuela_id) return EstadoSolicitud.PENDIENTE_JEFE_ESCUELA;
  if (ctx.jefe_id) return EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO;
  return EstadoSolicitud.PENDIENTE_TALENTO_HUMANO;
};

/**
 * Tras la aprobación del Jefe de Escuela:
 * - Si el Jefe de Escuela y el Jefe Inmediato son la MISMA persona, esa única
 *   aprobación cubre ambos niveles y se salta Talento Humano → APROBADA.
 * - Si son distintos, pasa al Jefe Inmediato (o a TH si no hubiera).
 */
const destinoAprobacionEscuela = (ctx: ContextoJerarquia): EstadoSolicitud => {
  if (ctx.jefe_escuela_id && ctx.jefe_escuela_id === ctx.jefe_id) {
    return EstadoSolicitud.APROBADA;
  }
  if (ctx.jefe_id) return EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO;
  return EstadoSolicitud.PENDIENTE_TALENTO_HUMANO;
};

/**
 * `TRANSICIONES_VALIDAS` es la ÚNICA fuente de verdad del flujo. Cualquier
 * (acción, estadoOrigen) no listada se rechaza como error de negocio.
 */
export const TRANSICIONES_VALIDAS: readonly DefinicionTransicion[] = [
  // El docente envía su borrador.
  {
    accion: TipoAccion.ENVIAR,
    estadoOrigen: EstadoSolicitud.BORRADOR,
    destino: destinoEnvio,
    etiqueta: 'ENVIO',
    requiereSerDueno: true,
    requiereSerJefeEscuela: false,
    requiereSerJefeInmediato: false,
    rolesPermitidos: TODOS_LOS_ROLES,
    requiereComentario: false,
  },

  // Nivel Jefe de Escuela.
  {
    accion: TipoAccion.APROBAR,
    estadoOrigen: EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
    destino: destinoAprobacionEscuela,
    etiqueta: 'APROBACION_JEFE_ESCUELA',
    requiereSerDueno: false,
    requiereSerJefeEscuela: true,
    requiereSerJefeInmediato: false,
    rolesPermitidos: [],
    requiereComentario: false,
  },
  {
    accion: TipoAccion.RECHAZAR,
    estadoOrigen: EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
    destino: EstadoSolicitud.RECHAZADA,
    etiqueta: 'RECHAZO_JEFE_ESCUELA',
    requiereSerDueno: false,
    requiereSerJefeEscuela: true,
    requiereSerJefeInmediato: false,
    rolesPermitidos: [],
    requiereComentario: true,
  },

  // Nivel Jefe Inmediato.
  {
    accion: TipoAccion.APROBAR,
    estadoOrigen: EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO,
    destino: EstadoSolicitud.PENDIENTE_TALENTO_HUMANO,
    etiqueta: 'APROBACION_JEFE_INMEDIATO',
    requiereSerDueno: false,
    requiereSerJefeEscuela: false,
    requiereSerJefeInmediato: true,
    rolesPermitidos: [],
    requiereComentario: false,
  },
  {
    accion: TipoAccion.RECHAZAR,
    estadoOrigen: EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO,
    destino: EstadoSolicitud.RECHAZADA,
    etiqueta: 'RECHAZO_JEFE_INMEDIATO',
    requiereSerDueno: false,
    requiereSerJefeEscuela: false,
    requiereSerJefeInmediato: true,
    rolesPermitidos: [],
    requiereComentario: true,
  },

  // Nivel Talento Humano.
  {
    accion: TipoAccion.APROBAR,
    estadoOrigen: EstadoSolicitud.PENDIENTE_TALENTO_HUMANO,
    destino: EstadoSolicitud.APROBADA,
    etiqueta: 'APROBACION_TALENTO_HUMANO',
    requiereSerDueno: false,
    requiereSerJefeEscuela: false,
    requiereSerJefeInmediato: false,
    rolesPermitidos: [Rol.TALENTO_HUMANO],
    requiereComentario: false,
  },
  {
    accion: TipoAccion.RECHAZAR,
    estadoOrigen: EstadoSolicitud.PENDIENTE_TALENTO_HUMANO,
    destino: EstadoSolicitud.RECHAZADA,
    etiqueta: 'RECHAZO_TALENTO_HUMANO',
    requiereSerDueno: false,
    requiereSerJefeEscuela: false,
    requiereSerJefeInmediato: false,
    rolesPermitidos: [Rol.TALENTO_HUMANO],
    requiereComentario: true,
  },

  // El docente cancela su solicitud mientras no esté resuelta.
  ...(
    [
      EstadoSolicitud.BORRADOR,
      EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
      EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO,
      EstadoSolicitud.PENDIENTE_TALENTO_HUMANO,
    ] as const
  ).map(
    (origen): DefinicionTransicion => ({
      accion: TipoAccion.CANCELAR,
      estadoOrigen: origen,
      destino: EstadoSolicitud.CANCELADA,
      etiqueta: 'CANCELACION',
      requiereSerDueno: true,
      requiereSerJefeEscuela: false,
      requiereSerJefeInmediato: false,
      rolesPermitidos: TODOS_LOS_ROLES,
      requiereComentario: false,
    }),
  ),
];

/** Busca la transición permitida para (acción, estadoOrigen). */
export function buscarTransicion(
  accion: TipoAccion,
  estadoOrigen: EstadoSolicitud,
): DefinicionTransicion | undefined {
  return TRANSICIONES_VALIDAS.find(
    (t) => t.accion === accion && t.estadoOrigen === estadoOrigen,
  );
}

/** Resuelve el estado destino (fijo o calculado por la jerarquía). */
export function resolverDestino(
  def: DefinicionTransicion,
  ctx: ContextoJerarquia,
): EstadoSolicitud {
  return typeof def.destino === 'function' ? def.destino(ctx) : def.destino;
}
