import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

/**
 * Módulo de autenticación. Los secretos/expiraciones de cada token se pasan
 * por llamada en `AuthService` (no en el registro global de JwtModule),
 * porque access y refresh usan secretos distintos.
 */
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({}),
    UsuariosModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
