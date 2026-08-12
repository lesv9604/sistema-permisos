import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Rol } from '../common/enums/rol.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { TiposPermisoService } from './tipos-permiso.service';
import { CrearTipoPermisoDto } from './dto/crear-tipo-permiso.dto';
import { ActualizarTipoPermisoDto } from './dto/actualizar-tipo-permiso.dto';

@Controller('tipos-permiso')
export class TiposPermisoController {
  constructor(private readonly tiposPermisoService: TiposPermisoService) {}

  /**
   * GET /api/tipos-permiso?soloActivos=false
   * Cualquier usuario autenticado puede consultar el catálogo (lo necesita
   * para crear una solicitud).
   */
  @Get()
  async listar(
    @Query('soloActivos', new ParseBoolPipe({ optional: true }))
    soloActivos?: boolean,
  ) {
    const data = await this.tiposPermisoService.listar(soloActivos ?? true);
    return { data, message: 'Listado de tipos de permiso' };
  }

  @Get(':id')
  async obtener(@Param('id', ParseIntPipe) id: number) {
    const data = await this.tiposPermisoService.obtenerPorId(id);
    return { data, message: 'Tipo de permiso' };
  }

  /** Solo ADMIN gestiona el catálogo (RBAC del CLAUDE.md). */
  @Roles(Rol.ADMIN)
  @Post()
  async crear(@Body() dto: CrearTipoPermisoDto) {
    const data = await this.tiposPermisoService.crear(dto);
    return { data, message: 'Tipo de permiso creado' };
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarTipoPermisoDto,
  ) {
    const data = await this.tiposPermisoService.actualizar(id, dto);
    return { data, message: 'Tipo de permiso actualizado' };
  }

  @Roles(Rol.ADMIN)
  @Delete(':id')
  async desactivar(@Param('id', ParseIntPipe) id: number) {
    const data = await this.tiposPermisoService.desactivar(id);
    return { data, message: 'Tipo de permiso desactivado' };
  }
}
