import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';

/**
 * Módulo de usuarios: expone el servicio (usado por Auth y el flujo) y el
 * CRUD de administración.
 */
@Module({
  imports: [ConfigModule, NotificacionesModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
