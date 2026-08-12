import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesGateway } from './notificaciones.gateway';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, NotificacionesGateway, EmailService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
