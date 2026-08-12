import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { JwtPayload, UsuarioAutenticado } from '../interfaces/jwt.interface';

/**
 * Estrategia del ACCESS token. Valida la firma y comprueba que el usuario
 * sigue existiendo y activo. Lo que retorna `validate` queda en `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usuariosService: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const usuario = await this.usuariosService.buscarPorId(payload.sub);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no válido o inactivo.');
    }
    return { id: usuario.id, email: usuario.email, rol: usuario.rol };
  }
}
