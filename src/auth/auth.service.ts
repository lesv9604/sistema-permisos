import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { UsuariosService } from '../usuarios/usuarios.service';
import {
  UsuarioConRol,
  UsuarioPublico,
} from '../usuarios/interfaces/usuario.interface';
import { JwtPayload } from './interfaces/jwt.interface';

interface Tokens {
  access_token: string;
  refresh_token: string;
}

export interface ResultadoAuth extends Tokens {
  usuario: UsuarioPublico;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Valida credenciales y emite los tokens. Mensaje de error genérico para
   * no revelar si el email existe o no.
   */
  async login(email: string, password: string): Promise<ResultadoAuth> {
    const usuario = await this.usuariosService.buscarPorEmail(email);
    const credencialesInvalidas = new UnauthorizedException(
      'Credenciales inválidas.',
    );

    if (!usuario || !usuario.activo) {
      throw credencialesInvalidas;
    }

    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      throw credencialesInvalidas;
    }

    return this.emitirSesion(usuario);
  }

  /**
   * Rota los tokens: valida el refresh token contra el hash almacenado y
   * emite un par nuevo. Si no coincide, revoca por seguridad.
   */
  async refrescar(
    usuarioId: string,
    refreshToken: string,
  ): Promise<ResultadoAuth> {
    const usuario = await this.usuariosService.buscarPorId(usuarioId);
    if (!usuario || !usuario.activo || !usuario.refresh_token_hash) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    if (!this.refreshTokenCoincide(refreshToken, usuario.refresh_token_hash)) {
      // Posible reutilización de un token antiguo: revocamos la sesión.
      await this.usuariosService.actualizarRefreshTokenHash(usuario.id, null);
      throw new UnauthorizedException('Sesión no válida.');
    }

    return this.emitirSesion(usuario);
  }

  /**
   * Cierra la sesión invalidando el refresh token almacenado.
   */
  async cerrarSesion(usuarioId: string): Promise<void> {
    await this.usuariosService.actualizarRefreshTokenHash(usuarioId, null);
  }

  async perfil(usuarioId: string): Promise<UsuarioPublico> {
    const usuario = await this.usuariosService.buscarPorId(usuarioId);
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    return this.usuariosService.aPublico(usuario);
  }

  /**
   * Genera el par de tokens, persiste el hash del refresh y devuelve el
   * usuario público + tokens.
   */
  private async emitirSesion(usuario: UsuarioConRol): Promise<ResultadoAuth> {
    const base = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    // `jsonwebtoken` v9 tipa `expiresIn` como número o duración de texto
    // (StringValue); el valor viene del `.env` como string, así que lo
    // ajustamos al tipo esperado por la opción.
    const expiracion = (valor: string): JwtSignOptions['expiresIn'] =>
      valor as JwtSignOptions['expiresIn'];

    // Cada token lleva un `jti` aleatorio: sin él, dos tokens firmados en el
    // mismo segundo (mismo sub/iat/exp) serían idénticos y romperían la
    // rotación y la detección de reúso del refresh token.
    const payloadAccess: JwtPayload = { ...base, jti: randomUUID() };
    const payloadRefresh: JwtPayload = { ...base, jti: randomUUID() };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payloadAccess, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: expiracion(
          this.config.get<string>('JWT_ACCESS_EXPIRES', '15m'),
        ),
      }),
      this.jwtService.signAsync(payloadRefresh, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: expiracion(
          this.config.get<string>('JWT_REFRESH_EXPIRES', '7d'),
        ),
      }),
    ]);

    await this.usuariosService.actualizarRefreshTokenHash(
      usuario.id,
      this.hashRefreshToken(refresh_token),
    );

    return {
      usuario: this.usuariosService.aPublico(usuario),
      access_token,
      refresh_token,
    };
  }

  /**
   * Hash del refresh token con SHA-256. NO se usa bcrypt aquí: bcrypt trunca
   * la entrada a 72 bytes y los JWT comparten prefijo (header + `sub`), lo que
   * anularía la rotación. El JWT ya es de alta entropía, así que SHA-256 basta.
   */
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Comparación en tiempo constante del refresh token contra el hash. */
  private refreshTokenCoincide(token: string, hashGuardado: string): boolean {
    const calculado = Buffer.from(this.hashRefreshToken(token), 'hex');
    const guardado = Buffer.from(hashGuardado, 'hex');
    if (calculado.length !== guardado.length) {
      return false;
    }
    return timingSafeEqual(calculado, guardado);
  }
}
