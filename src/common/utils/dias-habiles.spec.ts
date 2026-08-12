import { calcularDiasHabiles } from './dias-habiles.util';

// Nota: 2026-06-22 es lunes; 2026-06-20 sábado y 2026-06-21 domingo.
describe('calcularDiasHabiles', () => {
  it('semana completa de lunes a viernes = 5', () => {
    expect(calcularDiasHabiles('2026-06-22', '2026-06-26')).toBe(5);
  });

  it('un solo día hábil (mismo lunes) = 1', () => {
    expect(calcularDiasHabiles('2026-06-22', '2026-06-22')).toBe(1);
  });

  it('solo fin de semana (sábado a domingo) = 0', () => {
    expect(calcularDiasHabiles('2026-06-20', '2026-06-21')).toBe(0);
  });

  it('excluye el fin de semana intermedio (viernes a lunes) = 2', () => {
    expect(calcularDiasHabiles('2026-06-26', '2026-06-29')).toBe(2);
  });

  it('rango invertido (fin antes que inicio) = 0', () => {
    expect(calcularDiasHabiles('2026-06-26', '2026-06-22')).toBe(0);
  });

  it('cruce de mes cuenta solo días hábiles', () => {
    // 2026-06-29 (lun) … 2026-07-03 (vie) = 5 días hábiles.
    expect(calcularDiasHabiles('2026-06-29', '2026-07-03')).toBe(5);
  });

  it('dos semanas completas = 10 días hábiles', () => {
    // 2026-06-22 (lun) … 2026-07-03 (vie).
    expect(calcularDiasHabiles('2026-06-22', '2026-07-03')).toBe(10);
  });
});
