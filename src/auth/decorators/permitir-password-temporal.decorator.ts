import { SetMetadata } from '@nestjs/common';

export const PERMITIR_PASSWORD_TEMPORAL_KEY = 'permitirPasswordTemporal';

/**
 * Permite usar el endpoint aunque el usuario tenga una contraseña temporal
 * pendiente de cambio (p. ej. `/auth/me`, `/auth/cambiar-password`, logout).
 */
export const PermitirPasswordTemporal = (): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMITIR_PASSWORD_TEMPORAL_KEY, true);
