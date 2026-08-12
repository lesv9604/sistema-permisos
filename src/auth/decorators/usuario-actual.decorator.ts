import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UsuarioAutenticado } from '../interfaces/jwt.interface';

/**
 * Inyecta el usuario autenticado (o una de sus propiedades) en el handler.
 * Uso: `@UsuarioActual() usuario: UsuarioAutenticado`
 *      `@UsuarioActual('id') usuarioId: string`
 */
export const UsuarioActual = createParamDecorator(
  (campo: keyof UsuarioAutenticado | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const usuario = request.user as UsuarioAutenticado;
    return campo ? usuario?.[campo] : usuario;
  },
);
