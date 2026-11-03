import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMITIR_PASSWORD_TEMPORAL_KEY } from '../decorators/permitir-password-temporal.decorator';
import { UsuarioAutenticado } from '../interfaces/jwt.interface';

/**
 * Bloquea toda la API (403) mientras el usuario tenga una contraseña temporal,
 * salvo los endpoints marcados con `@PermitirPasswordTemporal()`. Se aplica
 * en el servidor para que no dependa solo del frontend.
 */
@Injectable()
export class PasswordTemporalGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const objetivos = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, objetivos)) {
      return true;
    }
    const usuario = context
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>().user;
    if (!usuario?.debeCambiarPassword) {
      return true;
    }
    if (
      this.reflector.getAllAndOverride<boolean>(
        PERMITIR_PASSWORD_TEMPORAL_KEY,
        objetivos,
      )
    ) {
      return true;
    }
    throw new ForbiddenException(
      'Debes cambiar tu contraseña temporal antes de continuar.',
    );
  }
}
