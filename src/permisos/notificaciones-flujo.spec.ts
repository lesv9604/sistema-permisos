import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum';
import { TipoNotificacion } from '../notificaciones/interfaces/notificacion.interface';
import { construirNotificacionesFlujo } from './notificaciones-flujo';
import { TipoAccion } from './transiciones';

const solicitud = {
  id: 'sol-1',
  docente_id: 'doc-1',
  fecha_inicio: '2026-10-05',
  fecha_fin: '2026-10-07',
};
const docente = {
  nombre: 'Diana',
  apellido: 'Docente',
  jefe_id: 'jefe-inm',
  jefe_escuela_id: 'jefe-esc',
};

describe('construirNotificacionesFlujo', () => {
  it('destino PENDIENTE_JEFE_ESCUELA → notifica al Jefe de Escuela', () => {
    const ns = construirNotificacionesFlujo(
      TipoAccion.ENVIAR,
      EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
      solicitud,
      docente,
      undefined,
      [],
    );
    expect(ns).toHaveLength(1);
    expect(ns[0].usuario_id).toBe('jefe-esc');
    expect(ns[0].tipo).toBe(TipoNotificacion.SOLICITUD_PENDIENTE);
  });

  it('si no hay Jefe de Escuela, no genera notificación', () => {
    const ns = construirNotificacionesFlujo(
      TipoAccion.ENVIAR,
      EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
      solicitud,
      { ...docente, jefe_escuela_id: null },
      undefined,
      [],
    );
    expect(ns).toHaveLength(0);
  });

  it('destino PENDIENTE_JEFE_INMEDIATO (aprobar) → notifica al jefe inmediato y avisa al docente', () => {
    const ns = construirNotificacionesFlujo(
      TipoAccion.APROBAR,
      EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO,
      solicitud,
      docente,
      undefined,
      [],
    );
    expect(ns).toHaveLength(2);
    expect(ns.some((n) => n.usuario_id === 'jefe-inm')).toBe(true);
    expect(
      ns.some(
        (n) =>
          n.usuario_id === 'doc-1' && n.tipo === TipoNotificacion.SOLICITUD_AVANZA,
      ),
    ).toBe(true);
  });

  it('destino PENDIENTE_TALENTO_HUMANO → notifica a todos los TH + aviso al docente', () => {
    const ns = construirNotificacionesFlujo(
      TipoAccion.APROBAR,
      EstadoSolicitud.PENDIENTE_TALENTO_HUMANO,
      solicitud,
      docente,
      undefined,
      ['th-1', 'th-2'],
    );
    expect(ns).toHaveLength(3);
    expect(ns.filter((n) => n.tipo === TipoNotificacion.SOLICITUD_PENDIENTE)).toHaveLength(2);
    expect(ns.some((n) => n.tipo === TipoNotificacion.SOLICITUD_AVANZA)).toBe(true);
  });

  it('destino APROBADA → notifica APROBADA al docente', () => {
    const ns = construirNotificacionesFlujo(
      TipoAccion.APROBAR,
      EstadoSolicitud.APROBADA,
      solicitud,
      docente,
      undefined,
      [],
    );
    expect(ns).toHaveLength(1);
    expect(ns[0].usuario_id).toBe('doc-1');
    expect(ns[0].tipo).toBe(TipoNotificacion.SOLICITUD_APROBADA);
  });

  it('destino RECHAZADA → notifica al docente con el motivo', () => {
    const ns = construirNotificacionesFlujo(
      TipoAccion.RECHAZAR,
      EstadoSolicitud.RECHAZADA,
      solicitud,
      docente,
      'Faltan soportes',
      [],
    );
    expect(ns).toHaveLength(1);
    expect(ns[0].tipo).toBe(TipoNotificacion.SOLICITUD_RECHAZADA);
    expect(ns[0].mensaje).toContain('Faltan soportes');
  });

  it('destino CANCELADA → notifica CANCELADA al docente', () => {
    const ns = construirNotificacionesFlujo(
      TipoAccion.CANCELAR,
      EstadoSolicitud.CANCELADA,
      solicitud,
      docente,
      undefined,
      [],
    );
    expect(ns).toHaveLength(1);
    expect(ns[0].tipo).toBe(TipoNotificacion.SOLICITUD_CANCELADA);
  });
});
