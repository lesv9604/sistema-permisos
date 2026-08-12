import * as dotenv from 'dotenv';
import type { Knex } from 'knex';
import { construirConfigKnex } from './src/database/knex.config';

// Carga las variables del archivo `.env` antes de construir la configuración.
dotenv.config();

// La CLI de Knex selecciona la clave según la variable de entorno
// `NODE_ENV` (development | production | test). Todos los entornos comparten
// la misma estructura; lo que cambia son los valores del `.env`.
const config: { [entorno: string]: Knex.Config } = {
  development: construirConfigKnex(),
  test: construirConfigKnex(),
  production: construirConfigKnex(),
};

export default config;
