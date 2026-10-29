import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { LoginGoogleDto } from "./dto/login-google.dto";
import { Public } from "./decorators/public.decorator";
import { UsuarioActual } from "./decorators/usuario-actual.decorator";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { UsuarioConRefresh } from "./interfaces/jwt.interface";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/auth/login — autenticación con email + contraseña. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() dto: LoginDto) {
    const resultado = await this.authService.login(dto.email, dto.password);
    return { data: resultado, message: "Inicio de sesión exitoso" };
  }

  /**
   * POST /api/auth/google — autenticación con cuenta institucional de Google.
   * Recibe el ID token de Google Identity Services.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("google")
  async loginGoogle(@Body() dto: LoginGoogleDto) {
    const resultado = await this.authService.loginGoogle(dto.idToken);
    return { data: resultado, message: "Inicio de sesión exitoso" };
  }

  /**
   * POST /api/auth/refresh — emite un par nuevo de tokens.
   * Requiere enviar el REFRESH token en el header `Authorization: Bearer`.
   */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  async refresh(@UsuarioActual() usuario: UsuarioConRefresh) {
    const resultado = await this.authService.refrescar(
      usuario.id,
      usuario.refreshToken,
    );
    return { data: resultado, message: "Tokens renovados" };
  }

  /** POST /api/auth/logout — invalida el refresh token del usuario. */
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  async logout(@UsuarioActual("id") usuarioId: string) {
    await this.authService.cerrarSesion(usuarioId);
    return { data: null, message: "Sesión cerrada" };
  }

  /** GET /api/auth/me — perfil del usuario autenticado. */
  @Get("me")
  async perfil(@UsuarioActual("id") usuarioId: string) {
    const usuario = await this.authService.perfil(usuarioId);
    return { data: usuario, message: "Perfil del usuario" };
  }
}
