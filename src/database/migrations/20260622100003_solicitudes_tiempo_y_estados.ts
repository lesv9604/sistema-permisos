import type { Knex } from 'knex';

/**
 * Cambia el modelo de tiempo y reestructura los estados de una solicitud:
 *  - Elimina `dias_habiles`.
 *  - Añade `unidad_tiempo` (enum DIAS/HORAS) y `cantidad_tiempo` (numeric).
 *  - Reestructura el enum `estado_solicitud` para el nuevo flujo:
 *      BORRADOR → PENDIENTE_JEFE_ESCUELA → PENDIENTE_JEFE_INMEDIATO →
 *      PENDIENTE_TALENTO_HUMANO → APROBADA (+ RECHAZADA, CANCELADA).
 *    El antiguo `PENDIENTE_JEFE` se mapea a `PENDIENTE_JEFE_INMEDIATO`.
 *
 * El enum se recrea (swap) para que la migración sea reversible.
 */
export async function up(knex: Knex): Promise<void> {
  // 1) Unidad/cantidad de tiempo y baja de dias_habiles.
  await knex.raw(`CREATE TYPE unidad_tiempo AS ENUM ('DIAS','HORAS')`);
  await knex.schema.alterTable('solicitudes_permiso', (table) => {
    table
      .specificType('unidad_tiempo', 'unidad_tiempo')
      .notNullable()
      .defaultTo('DIAS');
    table.decimal('cantidad_tiempo', 6, 2).notNullable().defaultTo(0);
    table.dropColumn('dias_habiles');
  });

  // 2) Reestructuración del enum de estado (swap con mapeo de datos).
  await knex.raw(
    `CREATE TYPE estado_solicitud_new AS ENUM (
      'BORRADOR',
      'PENDIENTE_JEFE_ESCUELA',
      'PENDIENTE_JEFE_INMEDIATO',
      'PENDIENTE_TALENTO_HUMANO',
      'APROBADA',
      'RECHAZADA',
      'CANCELADA'
    )`,
  );
  await knex.raw(
    `ALTER TABLE solicitudes_permiso ALTER COLUMN estado DROP DEFAULT`,
  );
  await knex.raw(
    `ALTER TABLE solicitudes_permiso
       ALTER COLUMN estado TYPE estado_solicitud_new
       USING (
         CASE estado::text
           WHEN 'PENDIENTE_JEFE' THEN 'PENDIENTE_JEFE_INMEDIATO'
           ELSE estado::text
         END
       )::estado_solicitud_new`,
  );
  await knex.raw(
    `ALTER TABLE solicitudes_permiso ALTER COLUMN estado SET DEFAULT 'BORRADOR'`,
  );
  await knex.raw(`DROP TYPE estado_solicitud`);
  await knex.raw(`ALTER TYPE estado_solicitud_new RENAME TO estado_solicitud`);
}

export async function down(knex: Knex): Promise<void> {
  // 1) Revertir el enum de estado al conjunto anterior.
  await knex.raw(
    `CREATE TYPE estado_solicitud_old AS ENUM (
      'BORRADOR',
      'PENDIENTE_JEFE',
      'PENDIENTE_TALENTO_HUMANO',
      'APROBADA',
      'RECHAZADA',
      'CANCELADA'
    )`,
  );
  await knex.raw(
    `ALTER TABLE solicitudes_permiso ALTER COLUMN estado DROP DEFAULT`,
  );
  await knex.raw(
    `ALTER TABLE solicitudes_permiso
       ALTER COLUMN estado TYPE estado_solicitud_old
       USING (
         CASE estado::text
           WHEN 'PENDIENTE_JEFE_ESCUELA' THEN 'PENDIENTE_JEFE'
           WHEN 'PENDIENTE_JEFE_INMEDIATO' THEN 'PENDIENTE_JEFE'
           ELSE estado::text
         END
       )::estado_solicitud_old`,
  );
  await knex.raw(
    `ALTER TABLE solicitudes_permiso ALTER COLUMN estado SET DEFAULT 'BORRADOR'`,
  );
  await knex.raw(`DROP TYPE estado_solicitud`);
  await knex.raw(`ALTER TYPE estado_solicitud_old RENAME TO estado_solicitud`);

  // 2) Restaurar dias_habiles y quitar unidad/cantidad de tiempo.
  await knex.schema.alterTable('solicitudes_permiso', (table) => {
    table.integer('dias_habiles').notNullable().defaultTo(0);
    table.dropColumn('unidad_tiempo');
    table.dropColumn('cantidad_tiempo');
  });
  await knex.raw(`DROP TYPE unidad_tiempo`);
}
