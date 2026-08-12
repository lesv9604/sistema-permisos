import * as path from 'path';
import { types } from 'pg';
import type { Knex } from 'knex';

// Las columnas `date` (OID 1082) se devuelven como string 'YYYY-MM-DD' en vez
// de como objeto Date. Así evitamos desfases por zona horaria y mantenemos un
// contrato de API consistente (las fechas viajan como 'YYYY-MM-DD').
types.setTypeParser(types.builtins.DATE, (valor: string) => valor);

// Las columnas `numeric`/`decimal` (p. ej. `cantidad_tiempo`) se devuelven como
// número en vez de string. No usamos precisión que exceda a un float.
types.setTypeParser(types.builtins.NUMERIC, (valor: string) =>
  parseFloat(valor),
);

/**
 * Construye la configuración de conexión de Knex a partir de las variables
 * de entorno. Centraliza la lógica para que tanto el `knexfile.ts` (CLI de
 * migraciones) como un futuro `DatabaseModule` de NestJS la reutilicen.
 *
 * Prioridad de la conexión:
 *   1. `DATABASE_URL` (cadena completa, p. ej. la de Supabase).
 *   2. Variables discretas `DB_HOST`, `DB_PORT`, `DB_USER`, etc.
 */
export function construirConexion(): Knex.PgConnectionConfig | string {
  const usarSsl = (process.env.DB_SSL ?? 'false').toLowerCase() === 'true';

  // SSL relajado: Supabase usa certificados que no siempre están en la
  // cadena de confianza local. `rejectUnauthorized: false` evita el fallo
  // de verificación manteniendo el cifrado del canal.
  const ssl = usarSsl ? { rejectUnauthorized: false } : undefined;

  const urlCompleta = process.env.DATABASE_URL?.trim();
  if (urlCompleta) {
    return {
      connectionString: urlCompleta,
      ssl,
    } as Knex.PgConnectionConfig;
  }

  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'talento_humano',
    ssl,
  };
}

/**
 * Configuración base de Knex compartida por todos los entornos.
 * Las migraciones y seeds viven en `src/database` y se ejecutan como
 * TypeScript mediante `ts-node`.
 */
export function construirConfigKnex(): Knex.Config {
  return {
    client: 'pg',
    connection: construirConexion(),
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
      extension: 'ts',
      tableName: 'knex_migrations',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  };
}
