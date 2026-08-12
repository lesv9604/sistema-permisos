import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoSolicitud } from '../../common/enums/estado-solicitud.enum';

/** Filtros para los reportes (query params). Todos opcionales. */
export class FiltrosReporteDto {
  @IsOptional()
  @IsEnum(EstadoSolicitud, { message: 'estado no es válido.' })
  estado?: EstadoSolicitud;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tipo_permiso_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  departamento?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fecha_desde debe ser YYYY-MM-DD.' })
  fecha_desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fecha_hasta debe ser YYYY-MM-DD.' })
  fecha_hasta?: string;
}
