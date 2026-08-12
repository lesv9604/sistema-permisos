import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Al rechazar, el comentario (motivo) es OBLIGATORIO. */
export class RechazoDto {
  @IsString()
  @IsNotEmpty({ message: 'El comentario es obligatorio al rechazar.' })
  @MinLength(3)
  @MaxLength(1000)
  comentario!: string;
}
