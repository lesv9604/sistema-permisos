import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, UsuarioConRefresh } from '../interfaces/jwt.interface';

/**
 * Estrategia del REFRESH token. Valida la firma con el secreto de refresh y
 * adjunta el token en claro para que el servicio lo compare contra el hash
 * almacenado (rotación/revocación).
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): UsuarioConRefresh {
    const header = req.get('authorization') ?? '';
    const refreshToken = header.replace(/^Bearer\s+/i, '').trim();
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token ausente.');
    }
    return {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
      refreshToken,
    };
  }
}
