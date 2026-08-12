import type { Knex } from 'knex';

/**
 * Añade `jefe_escuela_id` a `usuarios`: autorreferencia (FK a usuarios),
 * nullable, para la nueva jerarquía de aprobación con Jefe de Escuela.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuarios', (table) => {
    table
      .uuid('jefe_escuela_id')
      .nullable()
      .references('id')
      .inTable('usuarios')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
    table.index('jefe_escuela_id', 'idx_usuarios_jefe_escuela_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Al borrar la columna, PostgreSQL elimina su índice y su FK asociados.
  await knex.schema.alterTable('usuarios', (table) => {
    table.dropColumn('jefe_escuela_id');
  });
}
