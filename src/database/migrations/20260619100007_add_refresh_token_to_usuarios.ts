import type { Knex } from 'knex';

/**
 * Añade `refresh_token_hash` a `usuarios` para soportar la rotación y
 * revocación del refresh token (login/refresh/logout). Se guarda el HASH
 * del token, nunca el token en claro.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuarios', (table) => {
    table.string('refresh_token_hash', 255).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuarios', (table) => {
    table.dropColumn('refresh_token_hash');
  });
}
