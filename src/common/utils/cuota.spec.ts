import { UnidadTiempo } from '../enums/unidad-tiempo.enum';
import { aDias, calcularConsumoDias, excedeCuota } from './cuota.util';

describe('Utilidades de cuota anual', () => {
  describe('aDias (1 día = 8 horas)', () => {
    it('los días se quedan igual', () => {
      expect(aDias(UnidadTiempo.DIAS, 3)).toBe(3);
    });
    it('8 horas = 1 día', () => {
      expect(aDias(UnidadTiempo.HORAS, 8)).toBe(1);
    });
    it('4 horas = 0.5 días', () => {
      expect(aDias(UnidadTiempo.HORAS, 4)).toBe(0.5);
    });
  });

  describe('calcularConsumoDias', () => {
    it('suma mezclando días y horas', () => {
      const filas = [
        { unidad_tiempo: UnidadTiempo.DIAS, cantidad_tiempo: 2 },
        { unidad_tiempo: UnidadTiempo.HORAS, cantidad_tiempo: 8 }, // 1 día
        { unidad_tiempo: UnidadTiempo.HORAS, cantidad_tiempo: 4 }, // 0.5 días
      ];
      expect(calcularConsumoDias(filas)).toBeCloseTo(3.5, 5);
    });
    it('sin filas = 0', () => {
      expect(calcularConsumoDias([])).toBe(0);
    });
  });

  describe('excedeCuota', () => {
    it('no excede cuando justo alcanza el límite', () => {
      expect(excedeCuota(3, 2, 5)).toBe(false);
    });
    it('excede cuando lo supera', () => {
      expect(excedeCuota(3, 3, 5)).toBe(true);
    });
    it('tolera el error de coma flotante (0.1 + 0.2)', () => {
      expect(excedeCuota(0.1, 0.2, 0.3)).toBe(false);
    });
  });
});
