/**
 * Calcula los días hábiles (lunes a viernes) entre dos fechas, AMBAS
 * inclusive. Es la fuente de verdad del backend: el valor enviado por el
 * cliente NUNCA se usa (regla de negocio del CLAUDE.md).
 *
 * No contempla festivos: si más adelante se añade un calendario de festivos,
 * se descontarán aquí.
 *
 * @param fechaInicio fecha en formato 'YYYY-MM-DD'
 * @param fechaFin    fecha en formato 'YYYY-MM-DD'
 * @returns número de días hábiles (>= 0)
 */
export function calcularDiasHabiles(
  fechaInicio: string,
  fechaFin: string,
): number {
  const inicio = parsearFechaUTC(fechaInicio);
  const fin = parsearFechaUTC(fechaFin);

  if (fin < inicio) {
    return 0;
  }

  let dias = 0;
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    const diaSemana = cursor.getUTCDay(); // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      dias += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

/**
 * Convierte 'YYYY-MM-DD' a un Date en UTC a medianoche, evitando
 * desplazamientos por zona horaria.
 */
function parsearFechaUTC(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}
