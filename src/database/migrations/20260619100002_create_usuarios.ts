import type { Knex } from 'knex';

/**
 * Tabla `usuarios`: docentes y personal del sistema.
 * - `id` es UUID generado por la base de datos.
 * - `rol_id` referencia a `roles`.
 * - `jefe_id` es autorreferencia (jerarquía) y puede ser nulo.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('usuarios', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table
      .integer('rol_id')
      .notNullable()
      .references('id')
      .inTable('roles')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    table
      .uuid('jefe_id')
      .nullable()
      .references('id')
      .inTable('usuarios')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');

    table.string('nombre', 100).notNullable();
    table.string('apellido', 100).notNullable();
    table.string('email', 150).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('cedula', 30).notNullable().unique();
    table.string('departamento', 120).nullable();
    table.string('cargo', 120).nullable();
    table.boolean('activo').notNullable().defaultTo(true);

    table.timestamps(true, true); // created_at, updated_at (NOT NULL, default now)

    table.index('rol_id', 'idx_usuarios_rol_id');
    table.index('jefe_id', 'idx_usuarios_jefe_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('usuarios');
}
