import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { UsuarioAutenticado } from '../auth/interfaces/jwt.interface';
import { PermisosService } from './permisos.service';
import { FlujoAprobacionService } from './flujo-aprobacion.service';
import { HistorialService } from '../historial/historial.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ActualizarSolicitudDto } from './dto/actualizar-solicitud.dto';
import { ListarSolicitudesDto } from './dto/listar-solicitudes.dto';
import { AccionDto } from './dto/accion.dto';
import { RechazoDto } from './dto/rechazo.dto';
import { TipoAccion } from './transiciones';

@Controller('permisos')
export class PermisosController {
  constructor(
    private readonly permisosService: PermisosService,
    private readonly flujoAprobacionService: FlujoAprobacionService,
    private readonly historialService: HistorialService,
  ) {}

  /** POST /api/permisos — crea una solicitud propia (BORRADOR). */
  @Post()
  async crear(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearSolicitudDto,
  ) {
    const data = await this.permisosService.crear(usuario, dto);
    return { data, message: 'Solicitud creada en estado BORRADOR' };
  }

  /**
   * GET /api/permisos — lista las solicitudes visibles para el usuario
   * (aislamiento de datos según rol). Acepta filtros ?estado= y ?tipo_permiso_id=.
   */
  @Get()
  async listar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() filtros: ListarSolicitudesDto,
  ) {
    const data = await this.permisosService.listar(usuario, filtros);
    return { data, message: 'Listado de solicitudes' };
  }

  /** GET /api/permisos/resumen — conteos por estado para el dashboard. */
  @Get('resumen')
  async resumen(@UsuarioActual() usuario: UsuarioAutenticado) {
    const data = await this.permisosService.resumen(usuario);
    return { data, message: 'Resumen de solicitudes' };
  }

  /**
   * GET /api/permisos/cuota?tipo_permiso_id=&anio= — saldo de cuota anual del
   * usuario para un tipo de permiso (por defecto, el año actual).
   */
  @Get('cuota')
  async cuota(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query('tipo_permiso_id', ParseIntPipe) tipoPermisoId: number,
    @Query('anio', new ParseIntPipe({ optional: true })) anio?: number,
  ) {
    const data = await this.permisosService.cuota(
      usuario,
      tipoPermisoId,
      anio ?? new Date().getFullYear(),
    );
    return { data, message: 'Cuota anual del tipo de permiso' };
  }

  /** GET /api/permisos/:id — detalle (con validación de visibilidad). */
  @Get(':id')
  async obtener(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.permisosService.obtener(usuario, id);
    return { data, message: 'Detalle de la solicitud' };
  }

  /** PATCH /api/permisos/:id — edita la solicitud propia (solo BORRADOR). */
  @Patch(':id')
  async actualizar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarSolicitudDto,
  ) {
    const data = await this.permisosService.actualizar(usuario, id, dto);
    return { data, message: 'Solicitud actualizada' };
  }

  /** DELETE /api/permisos/:id — borra la solicitud propia (solo BORRADOR). */
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async eliminar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.permisosService.eliminar(usuario, id);
    return { data: null, message: 'Solicitud eliminada' };
  }

  // ---------------------------------------------------------------------------
  // Flujo de aprobación (transiciones de estado)
  // ---------------------------------------------------------------------------

  /** POST /api/permisos/:id/enviar — BORRADOR → PENDIENTE_JEFE (solo dueño). */
  @HttpCode(HttpStatus.OK)
  @Post(':id/enviar')
  async enviar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AccionDto,
    @Ip() ip: string,
  ) {
    const data = await this.flujoAprobacionService.ejecutarAccion(
      usuario,
      id,
      TipoAccion.ENVIAR,
      dto.comentario,
      ip ?? null,
    );
    return { data, message: 'Solicitud enviada a tu jefe inmediato' };
  }

  /**
   * POST /api/permisos/:id/aprobar — avanza el nivel correspondiente:
   * PENDIENTE_JEFE → PENDIENTE_TALENTO_HUMANO (jefe) o
   * PENDIENTE_TALENTO_HUMANO → APROBADA (Talento Humano).
   */
  @HttpCode(HttpStatus.OK)
  @Post(':id/aprobar')
  async aprobar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AccionDto,
    @Ip() ip: string,
  ) {
    const data = await this.flujoAprobacionService.ejecutarAccion(
      usuario,
      id,
      TipoAccion.APROBAR,
      dto.comentario,
      ip ?? null,
    );
    return { data, message: 'Solicitud aprobada' };
  }

  /** POST /api/permisos/:id/rechazar — comentario obligatorio. */
  @HttpCode(HttpStatus.OK)
  @Post(':id/rechazar')
  async rechazar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RechazoDto,
    @Ip() ip: string,
  ) {
    const data = await this.flujoAprobacionService.ejecutarAccion(
      usuario,
      id,
      TipoAccion.RECHAZAR,
      dto.comentario,
      ip ?? null,
    );
    return { data, message: 'Solicitud rechazada' };
  }

  /** POST /api/permisos/:id/cancelar — el dueño cancela su solicitud. */
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancelar')
  async cancelar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AccionDto,
    @Ip() ip: string,
  ) {
    const data = await this.flujoAprobacionService.ejecutarAccion(
      usuario,
      id,
      TipoAccion.CANCELAR,
      dto.comentario,
      ip ?? null,
    );
    return { data, message: 'Solicitud cancelada' };
  }

  /** GET /api/permisos/:id/historial — trazabilidad (con control de visibilidad). */
  @Get(':id/historial')
  async historial(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Reutiliza la validación de visibilidad: lanza 403/404 si no procede.
    await this.permisosService.obtener(usuario, id);
    const data = await this.historialService.listarPorSolicitud(id);
    return { data, message: 'Historial de la solicitud' };
  }
}
