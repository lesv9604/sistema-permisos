import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CrearTipoPermisoDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres.' })
  @MaxLength(120)
  nombre!: string;

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
