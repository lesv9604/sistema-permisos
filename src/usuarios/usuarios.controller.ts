import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Rol } from '../common/enums/rol.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';

/** Gestión de usuarios. Solo ADMIN (RBAC del CLAUDE.md). */
@Roles(Rol.ADMIN)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  async listar(
    @Query('rol') rol?: Rol,
    @Query('activo', new ParseBoolPipe({ optional: true })) activo?: boolean,
  ) {
    const data = await this.usuariosService.listar({ rol, activo });
    return { data, message: 'Listado de usuarios' };
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usuariosService.obtenerPublico(id);
    return { data, message: 'Usuario' };
  }

  @Post()
  async crear(@Body() dto: CrearUsuarioDto) {
    const data = await this.usuariosService.crear(dto);
    return { data, message: 'Usuario creado' };
  }

  /**
   * POST /api/usuarios/carga-masiva — crea usuarios en lote desde un CSV
   * (campo `file`). Solo ADMIN. El password por defecto es la cédula.
   */
  @Post('carga-masiva')
  @UseInterceptors(FileInterceptor('file'))
  async cargaMasiva(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo CSV (campo "file").');
    }
    const data = await this.usuariosService.cargaMasiva(
      file.buffer.toString('utf-8'),
    );
    return { data, message: `${data.creados} usuario(s) creados.` };
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    const data = await this.usuariosService.actualizar(id, dto);
    return { data, message: 'Usuario actualizado' };
  }

  /** Desactiva un usuario (soft delete). Un admin no puede desactivarse a sí mismo. */
  @Delete(':id')
  async desactivar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual('id') usuarioActualId: string,
  ) {
    if (id === usuarioActualId) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta.');
    }
    const data = await this.usuariosService.cambiarActivo(id, false);
    return { data, message: 'Usuario desactivado' };
  }
}
