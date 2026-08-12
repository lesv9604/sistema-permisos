import type { Knex } from 'knex';

/**
 * Tabla `roles`: catálogo de los 4 roles del sistema.
 * El nombre es un enum nativo de PostgreSQL (`rol_nombre`).
 */
export async function up(knex: Knex): Promise<void> {
  // `gen_random_uuid()` es nativo en PG13+, pero garantizamos la extensión
  // por compatibilidad con instancias más antiguas.
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table
      .enu('nombre', ['DOCENTE', 'JEFE_INMEDIATO', 'TALENTO_HUMANO', 'ADMIN'], {
        useNative: true,
        enumName: 'rol_nombre',
      })
      .notNullable()
      .unique();
    table.string('descripcion', 255).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('roles');
  // El tipo enum nativo no se elimina al borrar la tabla: hay que dropearlo.
  await knex.raw('DROP TYPE IF EXISTS rol_nombre');
}
