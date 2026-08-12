import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Endpoint de salud público (no requiere autenticación).
  @Public()
  @Get('health')
  estadoSalud(): { data: { status: string }; message: string } {
    return {
      data: { status: this.appService.estado() },
      message: 'API de Talento Humano operativa',
    };
  }
}
