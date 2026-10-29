import type { Knex } from 'knex';

/**
 * Añade `debe_cambiar_password`: cuando es `true`, el usuario tiene una
 * contraseña temporal (generada por el sistema o asignada por un ADMIN) y
 * debe cambiarla antes de usar el resto de la API.
 * Los usuarios existentes quedan en `false`.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuarios', (table) => {
    table.boolean('debe_cambiar_password').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuarios', (table) => {
    table.dropColumn('debe_cambiar_password');
  });
}
