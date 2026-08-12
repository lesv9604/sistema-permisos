import { SetMetadata } from '@nestjs/common';
import { Rol } from '../../common/enums/rol.enum';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a los roles indicados. ADMIN siempre tiene acceso
 * (lo resuelve el `RolesGuard`). Ejemplo: `@Roles(Rol.JEFE_INMEDIATO)`.
 */
export const Roles = (...roles: Rol[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
