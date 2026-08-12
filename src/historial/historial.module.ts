import { Module } from '@nestjs/common';
import { HistorialService } from './historial.service';

@Module({
  providers: [HistorialService],
  exports: [HistorialService],
})
export class HistorialModule {}
