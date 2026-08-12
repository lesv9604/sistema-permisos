import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Rol } from '../../common/enums/rol.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsuarioAutenticado } from '../interfaces/jwt.interface';

/**
 * Guard de RBAC. Comprueba que el rol del usuario autenticado esté entre los
 * permitidos por `@Roles(...)`. ADMIN siempre pasa (acceso total).
 *
 * IMPORTANTE: este guard es la primera línea, pero la propiedad del recurso
 * (un docente solo ve lo suyo) SIEMPRE se valida además en el servicio.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Sin @Roles => no hay restricción de rol (basta estar autenticado).
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const usuario = request.user as UsuarioAutenticado | undefined;

    if (!usuario) {
      throw new ForbiddenException('No autenticado.');
    }

    if (usuario.rol === Rol.ADMIN || rolesRequeridos.includes(usuario.rol)) {
      return true;
    }

    throw new ForbiddenException(
      'No tienes permisos suficientes para esta acción.',
    );
  }
}
