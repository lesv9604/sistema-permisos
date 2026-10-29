import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria.' })
  @MaxLength(100)
  passwordActual!: string;

  @IsString()
  @MinLength(10, { message: 'La nueva contraseña debe tener al menos 10 caracteres.' })
  @MaxLength(100)
  @Matches(/(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*\d)/, {
    message: 'La nueva contraseña debe incluir letras y números.',
  })
  passwordNueva!: string;
}
