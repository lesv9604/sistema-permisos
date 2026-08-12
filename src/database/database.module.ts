import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import knexLib, { Knex } from 'knex';
import { construirConfigKnex } from './knex.config';
import { KNEX_CONNECTION } from './database.constants';

/**
 * Módulo global de base de datos. Crea una única instancia de Knex
 * (pool de conexiones) y la expone mediante el token `KNEX_CONNECTION`.
 * Reutiliza la misma configuración que la CLI de migraciones.
 */
@Global()
@Module({
  providers: [
    {
      provide: KNEX_CONNECTION,
      useFactory: (): Knex => knexLib(construirConfigKnex()),
    },
  ],
  exports: [KNEX_CONNECTION],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  // Cierra el pool de conexiones cuando la app se apaga.
  async onApplicationShutdown(): Promise<void> {
    const knex = this.moduleRef.get<Knex>(KNEX_CONNECTION, { strict: false });
    if (knex) {
      await knex.destroy();
    }
  }
}
