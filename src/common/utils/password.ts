import { randomInt } from 'crypto';

// Sin caracteres ambiguos (0/O, 1/l/I) para que se puedan transcribir del correo.
const MAYUS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUS = 'abcdefghijkmnpqrstuvwxyz';
const DIGITOS = '23456789';
const SIMBOLOS = '!@#$%*?';
const TODOS = MAYUS + MINUS + DIGITOS + SIMBOLOS;

/**
 * Genera una contraseña temporal aleatoria (CSPRNG) de `longitud` caracteres
 * con al menos una mayúscula, una minúscula, un dígito y un símbolo.
 */
export function generarPasswordTemporal(longitud = 12): string {
  const elegir = (set: string) => set[randomInt(set.length)];
  const chars = [elegir(MAYUS), elegir(MINUS), elegir(DIGITOS), elegir(SIMBOLOS)];
  while (chars.length < longitud) chars.push(elegir(TODOS));
  // Fisher–Yates con CSPRNG.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
