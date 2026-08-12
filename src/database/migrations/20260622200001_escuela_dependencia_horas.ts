import type { Knex } from 'knex';

/**
 * Afina el modelo:
 *  - usuarios: renombra `departamento` → `escuela` y añade `dependencia`.
 *  - solicitudes_permiso: añade `hora_inicio` y `hora_fin` (time, nullable)
 *    para precisar los permisos por horas.
 *
 * El renombrado preserva los datos existentes (no se recrea la columna).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuarios', (table) => {
    table.renameColumn('departamento', 'escuela');
    table.string('dependencia', 120).nullable();
  });

  await knex.schema.alterTable('solicitudes_permiso', (table) => {
    table.time('hora_inicio').nullable();
    table.time('hora_fin').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('solicitudes_permiso', (table) => {
    table.dropColumn('hora_inicio');
    table.dropColumn('hora_fin');
  });

  await knex.schema.alterTable('usuarios', (table) => {
    table.dropColumn('dependencia');
    table.renameColumn('escuela', 'departamento');
  });
}
