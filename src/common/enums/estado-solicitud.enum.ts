/**
 * Estados de una solicitud de permiso. Coinciden EXACTAMENTE con el enum
 * nativo `estado_solicitud` de PostgreSQL.
 *
 * Flujo: BORRADOR → PENDIENTE_JEFE_ESCUELA → PENDIENTE_JEFE_INMEDIATO →
 *        PENDIENTE_TALENTO_HUMANO → APROBADA
 *        (RECHAZADA y CANCELADA son terminales alternativos).
 *
 * Las TRANSICIONES entre estados (incluida la regla de saltar a Talento
 * Humano / APROBADA) se implementan en el módulo de flujo de aprobación.
 */
export enum EstadoSolicitud {
  BORRADOR = 'BORRADOR',
  PENDIENTE_JEFE_ESCUELA = 'PENDIENTE_JEFE_ESCUELA',
  PENDIENTE_JEFE_INMEDIATO = 'PENDIENTE_JEFE_INMEDIATO',
  PENDIENTE_TALENTO_HUMANO = 'PENDIENTE_TALENTO_HUMANO',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  CANCELADA = 'CANCELADA',
}
