import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Rol } from '../../common/enums/rol.enum';

export class CrearUsuarioDto {
  @IsEnum(Rol, { message: 'El rol no es válido.' })
  rol!: Rol;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido!: string;

  @IsEmail({}, { message: 'El email no es válido.' })
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(100)
  password!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  cedula!: string;

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
  @IsUUID('4', { message: 'jefe_id debe ser un UUID válido.' })
  jefe_id?: string;

  @IsOptional()
  @IsUUID('4', { message: 'jefe_escuela_id debe ser un UUID válido.' })
  jefe_escuela_id?: string;
}
