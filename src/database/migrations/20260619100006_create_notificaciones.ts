import type { Knex } from 'knex';

/**
 * Tabla `notificaciones`: alertas in-app para los usuarios.
 * `solicitud_id` es opcional (puede haber notificaciones no ligadas a una
 * solicitud concreta).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notificaciones', (table) => {
    table.increments('id').primary();

    table
      .uuid('usuario_id')
      .notNullable()
      .references('id')
      .inTable('usuarios')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    table
      .uuid('solicitud_id')
      .nullable()
      .references('id')
      .inTable('solicitudes_permiso')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    table.string('tipo', 60).notNullable();
    table.string('titulo', 200).notNullable();
    table.text('mensaje').notNullable();
    table.boolean('leida').notNullable().defaultTo(false);

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('usuario_id', 'idx_notificaciones_usuario_id');
    table.index(['usuario_id', 'leida'], 'idx_notificaciones_usuario_leida');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notificaciones');
}
