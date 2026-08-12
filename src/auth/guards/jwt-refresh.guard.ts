import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard para el endpoint de refresh: valida el REFRESH token.
 * Se aplica localmente con `@UseGuards(JwtRefreshGuard)`.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
