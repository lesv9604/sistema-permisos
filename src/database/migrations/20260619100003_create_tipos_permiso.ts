import type { Knex } from 'knex';

/**
 * Tabla `tipos_permiso`: catálogo configurable de tipos de permiso
 * (médico, calamidad, personal, etc.).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tipos_permiso', (table) => {
    table.increments('id').primary();
    table.string('nombre', 120).notNullable().unique();
    table.string('descripcion', 255).nullable();
    table.boolean('requiere_soporte').notNullable().defaultTo(false);
    table.integer('max_dias_anuales').nullable();
    table.boolean('con_remuneracion').notNullable().defaultTo(true);
    table.boolean('activo').notNullable().defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tipos_permiso');
}
