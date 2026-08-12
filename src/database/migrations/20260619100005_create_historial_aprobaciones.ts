import type { Knex } from 'knex';

/**
 * Tabla `historial_aprobaciones`: registro INMUTABLE de auditoría.
 * Regla de negocio: solo se hacen INSERT; nunca UPDATE ni DELETE.
 * Por eso lleva únicamente `created_at` (sin `updated_at`).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('historial_aprobaciones', (table) => {
    table.increments('id').primary();

    table
      .uuid('solicitud_id')
      .notNullable()
      .references('id')
      .inTable('solicitudes_permiso')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    table
      .uuid('usuario_id')
      .notNullable()
      .references('id')
      .inTable('usuarios')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    table.string('accion', 100).notNullable();
    table.string('estado_anterior', 60).nullable();
    table.string('estado_nuevo', 60).nullable();
    table.text('comentario').nullable();
    table.string('ip_address', 45).nullable(); // soporta IPv6

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('solicitud_id', 'idx_historial_solicitud_id');
    table.index('usuario_id', 'idx_historial_usuario_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('historial_aprobaciones');
}
