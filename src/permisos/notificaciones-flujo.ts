import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum';
import {
  NuevaNotificacion,
  TipoNotificacion,
} from '../notificaciones/interfaces/notificacion.interface';
import { TipoAccion } from './transiciones';

export interface SolicitudNotif {
  id: string;
  docente_id: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface DocenteNotif {
  nombre: string;
  apellido: string;
  jefe_id: string | null;
  jefe_escuela_id: string | null;
}

/**
 * Construye las notificaciones in-app de una transición según su estado
 * destino. Función PURA: recibe los IDs de Talento Humano ya consultados, de
 * modo que no realiza IO y es directamente testeable.
 */
export function construirNotificacionesFlujo(
  accion: TipoAccion,
  destino: EstadoSolicitud,
  solicitud: SolicitudNotif,
  docente: DocenteNotif,
  comentario: string | undefined,
  idsTalentoHumano: string[],
): NuevaNotificacion[] {
  const notificaciones: NuevaNotificacion[] = [];
  const nombreDocente = `${docente.nombre} ${docente.apellido}`;
  const rango = `${solicitud.fecha_inicio} a ${solicitud.fecha_fin}`;

  const pendiente = (usuarioId: string, quien: string): NuevaNotificacion => ({
    usuario_id: usuarioId,
    solicitud_id: solicitud.id,
    tipo: TipoNotificacion.SOLICITUD_PENDIENTE,
    titulo: `Solicitud pendiente de tu aprobación (${quien})`,
    mensaje: `${nombreDocente} tiene una solicitud de permiso (${rango}).`,
  });

  const avisarDocenteAvanza = (): void => {
    if (accion === TipoAccion.APROBAR) {
      notificaciones.push({
        usuario_id: solicitud.docente_id,
        solicitud_id: solicitud.id,
        tipo: TipoNotificacion.SOLICITUD_AVANZA,
        titulo: 'Tu solicitud avanzó',
        mensaje: 'Tu solicitud pasó al siguiente nivel de aprobación.',
      });
    }
  };

  switch (destino) {
    case EstadoSolicitud.PENDIENTE_JEFE_ESCUELA:
      if (docente.jefe_escuela_id) {
        notificaciones.push(
          pendiente(docente.jefe_escuela_id, 'Jefe de Escuela'),
        );
      }
      break;

    case EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO:
      if (docente.jefe_id) {
        notificaciones.push(pendiente(docente.jefe_id, 'Jefe Inmediato'));
      }
      avisarDocenteAvanza();
      break;

    case EstadoSolicitud.PENDIENTE_TALENTO_HUMANO:
      for (const thId of idsTalentoHumano) {
        notificaciones.push(pendiente(thId, 'Talento Humano'));
      }
      avisarDocenteAvanza();
      break;

    case EstadoSolicitud.APROBADA:
      notificaciones.push({
        usuario_id: solicitud.docente_id,
        solicitud_id: solicitud.id,
        tipo: TipoNotificacion.SOLICITUD_APROBADA,
        titulo: 'Solicitud aprobada',
        mensaje: 'Tu solicitud de permiso fue aprobada.',
      });
      break;

    case EstadoSolicitud.RECHAZADA:
      notificaciones.push({
        usuario_id: solicitud.docente_id,
        solicitud_id: solicitud.id,
        tipo: TipoNotificacion.SOLICITUD_RECHAZADA,
        titulo: 'Solicitud rechazada',
        mensaje: `Tu solicitud fue rechazada. Motivo: ${comentario ?? '-'}.`,
      });
      break;

    case EstadoSolicitud.CANCELADA:
      notificaciones.push({
        usuario_id: solicitud.docente_id,
        solicitud_id: solicitud.id,
        tipo: TipoNotificacion.SOLICITUD_CANCELADA,
        titulo: 'Solicitud cancelada',
        mensaje: 'La solicitud fue cancelada.',
      });
      break;

    default:
      break;
  }

  return notificaciones;
}
