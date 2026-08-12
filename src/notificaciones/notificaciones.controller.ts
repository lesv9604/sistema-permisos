import {
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /** GET /api/notificaciones?soloNoLeidas=true — las del usuario autenticado. */
  @Get()
  async listar(
    @UsuarioActual('id') usuarioId: string,
    @Query('soloNoLeidas', new ParseBoolPipe({ optional: true }))
    soloNoLeidas?: boolean,
  ) {
    const data = await this.notificacionesService.listar(
      usuarioId,
      soloNoLeidas ?? false,
    );
    return { data, message: 'Listado de notificaciones' };
  }

  /** GET /api/notificaciones/conteo-no-leidas */
  @Get('conteo-no-leidas')
  async conteoNoLeidas(@UsuarioActual('id') usuarioId: string) {
    const total = await this.notificacionesService.conteoNoLeidas(usuarioId);
    return { data: { noLeidas: total }, message: 'Conteo de no leídas' };
  }

  /** PATCH /api/notificaciones/leer-todas */
  @Patch('leer-todas')
  async leerTodas(@UsuarioActual('id') usuarioId: string) {
    const data = await this.notificacionesService.marcarTodasLeidas(usuarioId);
    return { data, message: 'Notificaciones marcadas como leídas' };
  }

  /** PATCH /api/notificaciones/:id/leer */
  @Patch(':id/leer')
  async leer(
    @UsuarioActual('id') usuarioId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.notificacionesService.marcarLeida(usuarioId, id);
    return { data, message: 'Notificación marcada como leída' };
  }
}
