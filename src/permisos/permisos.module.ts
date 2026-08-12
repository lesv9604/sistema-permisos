import { Module } from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { FlujoAprobacionService } from './flujo-aprobacion.service';
import { CuotaService } from './cuota.service';
import { PermisosController } from './permisos.controller';
import { HistorialModule } from '../historial/historial.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [HistorialModule, NotificacionesModule],
  controllers: [PermisosController],
  providers: [PermisosService, FlujoAprobacionService, CuotaService],
  exports: [PermisosService, FlujoAprobacionService, CuotaService],
})
export class PermisosModule {}
