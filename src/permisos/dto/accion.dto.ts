import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Comentario opcional para enviar / aprobar / cancelar. */
export class AccionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
