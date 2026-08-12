import { Module } from '@nestjs/common';
import { TiposPermisoService } from './tipos-permiso.service';
import { TiposPermisoController } from './tipos-permiso.controller';

@Module({
  controllers: [TiposPermisoController],
  providers: [TiposPermisoService],
  exports: [TiposPermisoService],
})
export class TiposPermisoModule {}
