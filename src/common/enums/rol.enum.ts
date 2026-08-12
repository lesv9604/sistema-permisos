/**
 * Roles del sistema. Los valores coinciden EXACTAMENTE con el enum nativo
 * `rol_nombre` de PostgreSQL y con la columna `roles.nombre`.
 */
export enum Rol {
  DOCENTE = 'DOCENTE',
  JEFE_INMEDIATO = 'JEFE_INMEDIATO',
  JEFE_ESCUELA = 'JEFE_ESCUELA',
  TALENTO_HUMANO = 'TALENTO_HUMANO',
  ADMIN = 'ADMIN',
}
