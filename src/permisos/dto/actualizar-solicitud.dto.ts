import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { UnidadTiempo } from '../../common/enums/unidad-tiempo.enum';

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Actualización parcial de una solicitud. Solo se permite mientras está en
 * BORRADOR y solo sobre solicitudes propias (validado en el servicio).
 */
export class ActualizarSolicitudDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  tipo_permiso_id?: number;

  @IsOptional()
  @IsEnum(UnidadTiempo)
  unidad_tiempo?: UnidadTiempo;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cantidad_tiempo?: number;

  @IsOptional()
  @IsDateString({}, { message: 'fecha_inicio debe tener formato YYYY-MM-DD.' })
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fecha_fin debe tener formato YYYY-MM-DD.' })
  fecha_fin?: string;

  @IsOptional()
  @Matches(HORA_RE, { message: 'hora_inicio debe tener formato HH:MM.' })
  hora_inicio?: string;

  @IsOptional()
  @Matches(HORA_RE, { message: 'hora_fin debe tener formato HH:MM.' })
  hora_fin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;

  @IsOptional()
  @IsUUID('4')
  docente_sustituto_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  plan_trabajo_adjunto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  documento_soporte?: string;
}
