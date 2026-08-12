import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Rol } from '../../common/enums/rol.enum';

/**
 * Actualización parcial de un usuario. Todos los campos son opcionales;
 * `password` solo se actualiza si se envía (reseteo). `jefe_id: null` permite
 * quitar el jefe asignado.
 */
export class ActualizarUsuarioDto {
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  cedula?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  escuela?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dependencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cargo?: string;

  @IsOptional()
  @IsUUID('4')
  jefe_id?: string | null;

  @IsOptional()
  @IsUUID('4')
  jefe_escuela_id?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
