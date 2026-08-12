import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Todos los campos son opcionales (actualización parcial). Se valida en el
 * servicio que llegue al menos uno.
 */
export class ActualizarTipoPermisoDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  requiere_soporte?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_dias_anuales?: number;

  @IsOptional()
  @IsBoolean()
  con_remuneracion?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
