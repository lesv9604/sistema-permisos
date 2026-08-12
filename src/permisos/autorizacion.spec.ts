import { ForbiddenException } from '@nestjs/common';
import { Rol } from '../common/enums/rol.enum';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum';
import { verificarAutoridad } from './autorizacion';
import { buscarTransicion, TipoAccion } from './transiciones';

const DOCENTE = 'id-docente';
const JEFE_ESCUELA = 'id-jefe-escuela';
const JEFE_INMEDIATO = 'id-jefe-inmediato';
const OTRO = 'id-otro';

const jerarquia = {
  jefe_id: JEFE_INMEDIATO,
  jefe_escuela_id: JEFE_ESCUELA,
};

const def = (accion: TipoAccion, origen: EstadoSolicitud) => {
  const d = buscarTransicion(accion, origen);
  if (!d) throw new Error('transición no encontrada en el test');
  return d;
};

describe('verificarAutoridad', () => {
  describe('ENVIAR (requiere ser el dueño)', () => {
    const d = def(TipoAccion.ENVIAR, EstadoSolicitud.BORRADOR);

    it('el dueño puede', () => {
      expect(() =>
        verificarAutoridad({ id: DOCENTE, rol: Rol.DOCENTE }, d, DOCENTE, jerarquia),
      ).not.toThrow();
    });

    it('un tercero NO puede', () => {
      expect(() =>
        verificarAutoridad({ id: OTRO, rol: Rol.DOCENTE }, d, DOCENTE, jerarquia),
      ).toThrow(ForbiddenException);
    });

    it('ni siquiera ADMIN puede enviar por otro (acción de dueño)', () => {
      expect(() =>
        verificarAutoridad({ id: OTRO, rol: Rol.ADMIN }, d, DOCENTE, jerarquia),
      ).toThrow(ForbiddenException);
    });
  });

  describe('Aprobación de Jefe de Escuela', () => {
    const d = def(TipoAccion.APROBAR, EstadoSolicitud.PENDIENTE_JEFE_ESCUELA);

    it('el Jefe de Escuela del docente puede', () => {
      expect(() =>
        verificarAutoridad(
          { id: JEFE_ESCUELA, rol: Rol.JEFE_ESCUELA },
          d,
          DOCENTE,
          jerarquia,
        ),
      ).not.toThrow();
    });

    it('el Jefe Inmediato (que no es el de escuela) NO puede', () => {
      expect(() =>
        verificarAutoridad(
          { id: JEFE_INMEDIATO, rol: Rol.JEFE_INMEDIATO },
          d,
          DOCENTE,
          jerarquia,
        ),
      ).toThrow(ForbiddenException);
    });

    it('ADMIN puede (omite la comprobación de nivel)', () => {
      expect(() =>
        verificarAutoridad({ id: OTRO, rol: Rol.ADMIN }, d, DOCENTE, jerarquia),
      ).not.toThrow();
    });
  });

  describe('Aprobación de Jefe Inmediato', () => {
    const d = def(TipoAccion.APROBAR, EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO);

    it('el Jefe Inmediato del docente puede', () => {
      expect(() =>
        verificarAutoridad(
          { id: JEFE_INMEDIATO, rol: Rol.JEFE_INMEDIATO },
          d,
          DOCENTE,
          jerarquia,
        ),
      ).not.toThrow();
    });

    it('el Jefe de Escuela NO puede en este nivel', () => {
      expect(() =>
        verificarAutoridad(
          { id: JEFE_ESCUELA, rol: Rol.JEFE_ESCUELA },
          d,
          DOCENTE,
          jerarquia,
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('Aprobación de Talento Humano', () => {
    const d = def(TipoAccion.APROBAR, EstadoSolicitud.PENDIENTE_TALENTO_HUMANO);

    it('un usuario con rol TALENTO_HUMANO puede', () => {
      expect(() =>
        verificarAutoridad(
          { id: OTRO, rol: Rol.TALENTO_HUMANO },
          d,
          DOCENTE,
          jerarquia,
        ),
      ).not.toThrow();
    });

    it('un Jefe Inmediato NO puede en TH', () => {
      expect(() =>
        verificarAutoridad(
          { id: JEFE_INMEDIATO, rol: Rol.JEFE_INMEDIATO },
          d,
          DOCENTE,
          jerarquia,
        ),
      ).toThrow(ForbiddenException);
    });

    it('ADMIN puede', () => {
      expect(() =>
        verificarAutoridad({ id: OTRO, rol: Rol.ADMIN }, d, DOCENTE, jerarquia),
      ).not.toThrow();
    });
  });

  describe('CANCELAR (requiere ser el dueño)', () => {
    const d = def(TipoAccion.CANCELAR, EstadoSolicitud.PENDIENTE_JEFE_INMEDIATO);

    it('el dueño puede cancelar', () => {
      expect(() =>
        verificarAutoridad({ id: DOCENTE, rol: Rol.DOCENTE }, d, DOCENTE, jerarquia),
      ).not.toThrow();
    });

    it('un tercero NO puede cancelar', () => {
      expect(() =>
        verificarAutoridad(
          { id: JEFE_INMEDIATO, rol: Rol.JEFE_INMEDIATO },
          d,
          DOCENTE,
          jerarquia,
        ),
      ).toThrow(ForbiddenException);
    });
  });
});
