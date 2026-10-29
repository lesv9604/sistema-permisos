import { IsJWT, MaxLength } from "class-validator";

export class LoginGoogleDto {
  /** ID token (credential) emitido por Google Identity Services. */
  @IsJWT({ message: "Token de Google inválido." })
  @MaxLength(4096)
  idToken!: string;
}
