import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoSolicitud } from '../../common/enums/estado-solicitud.enum';

/** Filtros opcionales para GET /api/permisos (query params). */
export class ListarSolicitudesDto {
  @IsOptional()
  @IsEnum(EstadoSolicitud, { message: 'estado no es un valor válido.' })
  estado?: EstadoSolicitud;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tipo_permiso_id?: number;
}
