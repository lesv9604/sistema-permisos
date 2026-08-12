import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { UnidadTiempo } from '../../common/enums/unidad-tiempo.enum';

/** Formato de hora aceptado: HH:MM (24h), opcionalmente con segundos. */
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Datos para crear una solicitud (siempre nace en BORRADOR).
 *
 * NO incluye `docente_id` (se toma del usuario autenticado) ni `estado`.
 * Para DIAS, `cantidad_tiempo` se recalcula en el backend (días hábiles);
 * para HORAS es obligatoria y se valida (> 0).
 */
export class CrearSolicitudDto {
  @IsInt()
  @Min(1)
  tipo_permiso_id!: number;

  @IsEnum(UnidadTiempo, { message: 'unidad_tiempo debe ser DIAS u HORAS.' })
  unidad_tiempo!: UnidadTiempo;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'cantidad_tiempo debe ser mayor que 0.' })
  cantidad_tiempo?: number;

  @IsDateString(
    {},
    { message: 'fecha_inicio debe tener formato YYYY-MM-DD.' },
  )
  fecha_inicio!: string;

  @IsDateString({}, { message: 'fecha_fin debe tener formato YYYY-MM-DD.' })
  fecha_fin!: string;

  // hora_inicio / hora_fin son OBLIGATORIAS estrictamente si unidad_tiempo es
  // HORAS. Para DIAS se ignoran (el servicio las guarda como null).
  @ValidateIf((o: CrearSolicitudDto) => o.unidad_tiempo === UnidadTiempo.HORAS)
  @IsNotEmpty({ message: 'hora_inicio es obligatoria para permisos por HORAS.' })
  @Matches(HORA_RE, { message: 'hora_inicio debe tener formato HH:MM.' })
  hora_inicio?: string;

  @ValidateIf((o: CrearSolicitudDto) => o.unidad_tiempo === UnidadTiempo.HORAS)
  @IsNotEmpty({ message: 'hora_fin es obligatoria para permisos por HORAS.' })
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
  @IsUUID('4', { message: 'docente_sustituto_id debe ser un UUID válido.' })
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
