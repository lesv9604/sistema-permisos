import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum';
import {
  buscarTransicion,
  ContextoJerarquia,
  resolverDestino,
  TipoAccion,
  TRANSICIONES_VALIDAS,
} from './transiciones';

const JEFE_ESCUELA = 'id-jefe-escuela';
const JEFE_INMEDIATO = 'id-jefe-inmediato';

/** Resuelve el destino de una (acción, estadoOrigen) con una jerarquía dada. */
function destino(
  accion: TipoAccion,
  origen: EstadoSolicitud,
  ctx: ContextoJerarquia,
): EstadoSolicitud {
  const def = buscarTransicion(accion, origen);
  if (!def) throw new Error('transición no encontrada');
  return resolverDestino(def, ctx);
}

describe('Máquina de estados del flujo de aprobación', () => {
  describe('ENVIAR (BORRADOR → ...)', () => {
    it('con Jefe de Escuela asignado → PENDIENTE_JEFE_ESCUELA', () => {
      expect(
        destino(TipoAccion.ENVIAR, EstadoSolicitud.BORRADOR, {
          jefe_id: JEFE_INMEDIATO,
          jefe_escuela_id: JEFE_ESCUELA,
        }),
      ).toBe(EstadoSolicitud.PENDIENTE_JEFE_ESCUELA);
    });

    it('sin Jefe de Escuela pero con Jefe Inmediato → PENDIENTE_JEFE_INMEDIATO', () => {
      expect(
        destino(TipoAccion.ENVIAR, EstadoSolicitud.BORRADOR, {
          jefe_id: JEFE_INMEDIATO,
          jefe_escuela_id: null,
        }),
      ).toBe(EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO);
    });

    it('sin ningún jefe → PENDIENTE_TALENTO_HUMANO (respaldo)', () => {
      expect(
        destino(TipoAccion.ENVIAR, EstadoSolicitud.BORRADOR, {
          jefe_id: null,
          jefe_escuela_id: null,
        }),
      ).toBe(EstadoSolicitud.PENDIENTE_TALENTO_HUMANO);
    });
  });

  describe('Aprobación del Jefe de Escuela (regla de "misma persona")', () => {
    it('si Jefe de Escuela y Jefe Inmediato son la MISMA persona → APROBADA (salta inmediato y TH)', () => {
      expect(
        destino(
          TipoAccion.APROBAR,
          EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
          { jefe_id: JEFE_ESCUELA, jefe_escuela_id: JEFE_ESCUELA },
        ),
      ).toBe(EstadoSolicitud.APROBADA);
    });

    it('si son personas distintas → PENDIENTE_JEFE_INMEDIATO', () => {
      expect(
        destino(
          TipoAccion.APROBAR,
          EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
          { jefe_id: JEFE_INMEDIATO, jefe_escuela_id: JEFE_ESCUELA },
        ),
      ).toBe(EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO);
    });

    it('si no hay Jefe Inmediato → PENDIENTE_TALENTO_HUMANO', () => {
      expect(
        destino(
          TipoAccion.APROBAR,
          EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
          { jefe_id: null, jefe_escuela_id: JEFE_ESCUELA },
        ),
      ).toBe(EstadoSolicitud.PENDIENTE_TALENTO_HUMANO);
    });
  });

  describe('Camino normal (personas distintas)', () => {
    const ctx: ContextoJerarquia = {
      jefe_id: JEFE_INMEDIATO,
      jefe_escuela_id: JEFE_ESCUELA,
    };

    it('Jefe Inmediato aprueba → PENDIENTE_TALENTO_HUMANO', () => {
      expect(
        destino(TipoAccion.APROBAR, EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO, ctx),
      ).toBe(EstadoSolicitud.PENDIENTE_TALENTO_HUMANO);
    });

    it('Talento Humano aprueba → APROBADA', () => {
      expect(
        destino(
          TipoAccion.APROBAR,
          EstadoSolicitud.PENDIENTE_TALENTO_HUMANO,
          ctx,
        ),
      ).toBe(EstadoSolicitud.APROBADA);
    });

    it('la secuencia completa es escuela → inmediato → TH → APROBADA', () => {
      let estado = destino(TipoAccion.ENVIAR, EstadoSolicitud.BORRADOR, ctx);
      expect(estado).toBe(EstadoSolicitud.PENDIENTE_JEFE_ESCUELA);
      estado = destino(TipoAccion.APROBAR, estado, ctx);
      expect(estado).toBe(EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO);
      estado = destino(TipoAccion.APROBAR, estado, ctx);
      expect(estado).toBe(EstadoSolicitud.PENDIENTE_TALENTO_HUMANO);
      estado = destino(TipoAccion.APROBAR, estado, ctx);
      expect(estado).toBe(EstadoSolicitud.APROBADA);
    });
  });

  describe('Rechazos', () => {
    const pendientes = [
      EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
      EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO,
      EstadoSolicitud.PENDIENTE_TALENTO_HUMANO,
    ];

    it.each(pendientes)(
      'RECHAZAR desde %s → RECHAZADA y exige comentario',
      (origen) => {
        const def = buscarTransicion(TipoAccion.RECHAZAR, origen);
        expect(def).toBeDefined();
        expect(def!.requiereComentario).toBe(true);
        expect(
          resolverDestino(def!, {
            jefe_id: JEFE_INMEDIATO,
            jefe_escuela_id: JEFE_ESCUELA,
          }),
        ).toBe(EstadoSolicitud.RECHAZADA);
      },
    );
  });

  describe('Cancelación', () => {
    it.each([
      EstadoSolicitud.BORRADOR,
      EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
      EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO,
      EstadoSolicitud.PENDIENTE_TALENTO_HUMANO,
    ])('permitida desde %s → CANCELADA (solo el dueño)', (origen) => {
      const def = buscarTransicion(TipoAccion.CANCELAR, origen);
      expect(def).toBeDefined();
      expect(def!.requiereSerDueno).toBe(true);
      expect(def!.destino).toBe(EstadoSolicitud.CANCELADA);
    });

    it.each([
      EstadoSolicitud.APROBADA,
      EstadoSolicitud.RECHAZADA,
      EstadoSolicitud.CANCELADA,
    ])('NO permitida desde estado terminal %s', (origen) => {
      expect(buscarTransicion(TipoAccion.CANCELAR, origen)).toBeUndefined();
    });
  });

  describe('Transiciones inválidas (error de negocio)', () => {
    it('APROBAR desde BORRADOR no existe', () => {
      expect(
        buscarTransicion(TipoAccion.APROBAR, EstadoSolicitud.BORRADOR),
      ).toBeUndefined();
    });

    it('ENVIAR desde APROBADA no existe', () => {
      expect(
        buscarTransicion(TipoAccion.ENVIAR, EstadoSolicitud.APROBADA),
      ).toBeUndefined();
    });

    it.each([
      EstadoSolicitud.APROBADA,
      EstadoSolicitud.RECHAZADA,
      EstadoSolicitud.CANCELADA,
    ])('ninguna acción es válida desde el estado terminal %s', (origen) => {
      for (const accion of Object.values(TipoAccion)) {
        expect(buscarTransicion(accion, origen)).toBeUndefined();
      }
    });
  });

  describe('Autorización por nivel (flags de la definición)', () => {
    it('la aprobación de escuela exige ser el Jefe de Escuela', () => {
      const def = buscarTransicion(
        TipoAccion.APROBAR,
        EstadoSolicitud.PENDIENTE_JEFE_ESCUELA,
      )!;
      expect(def.requiereSerJefeEscuela).toBe(true);
      expect(def.requiereSerJefeInmediato).toBe(false);
    });

    it('la aprobación de inmediato exige ser el Jefe Inmediato', () => {
      const def = buscarTransicion(
        TipoAccion.APROBAR,
        EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO,
      )!;
      expect(def.requiereSerJefeInmediato).toBe(true);
      expect(def.requiereSerJefeEscuela).toBe(false);
    });

    it('la aprobación de TH exige el rol TALENTO_HUMANO', () => {
      const def = buscarTransicion(
        TipoAccion.APROBAR,
        EstadoSolicitud.PENDIENTE_TALENTO_HUMANO,
      )!;
      expect(def.rolesPermitidos).toContain('TALENTO_HUMANO');
    });
  });

  it('no existen (acción, estadoOrigen) duplicados en la tabla de transiciones', () => {
    const claves = TRANSICIONES_VALIDAS.map((t) => `${t.accion}:${t.estadoOrigen}`);
    expect(new Set(claves).size).toBe(claves.length);
  });
});
