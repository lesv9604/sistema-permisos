import type { Knex } from 'knex';

/**
 * Añade el valor `JEFE_ESCUELA` al enum nativo `rol_nombre`.
 *
 * PostgreSQL no permite quitar valores de un enum ni revertir un
 * `ALTER TYPE ... ADD VALUE`, así que en lugar de eso recreamos el tipo
 * (crear nuevo → convertir la columna → renombrar). De este modo la migración
 * es completamente reversible.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `CREATE TYPE rol_nombre_new AS ENUM ('DOCENTE','JEFE_INMEDIATO','JEFE_ESCUELA','TALENTO_HUMANO','ADMIN')`,
  );
  await knex.raw(
    `ALTER TABLE roles ALTER COLUMN nombre TYPE rol_nombre_new USING nombre::text::rol_nombre_new`,
  );
  await knex.raw(`DROP TYPE rol_nombre`);
  await knex.raw(`ALTER TYPE rol_nombre_new RENAME TO rol_nombre`);
}

export async function down(knex: Knex): Promise<void> {
  // Para poder revertir el tipo, primero eliminamos cualquier dato que use el
  // valor nuevo (usuarios con rol JEFE_ESCUELA y el propio rol). Las FKs de
  // `jefe_id`/`jefe_escuela_id` se ponen a NULL (ON DELETE SET NULL).
  await knex.raw(
    `DELETE FROM usuarios WHERE rol_id IN (SELECT id FROM roles WHERE nombre = 'JEFE_ESCUELA')`,
  );
  await knex.raw(`DELETE FROM roles WHERE nombre = 'JEFE_ESCUELA'`);

  await knex.raw(
    `CREATE TYPE rol_nombre_old AS ENUM ('DOCENTE','JEFE_INMEDIATO','TALENTO_HUMANO','ADMIN')`,
  );
  await knex.raw(
    `ALTER TABLE roles ALTER COLUMN nombre TYPE rol_nombre_old USING nombre::text::rol_nombre_old`,
  );
  await knex.raw(`DROP TYPE rol_nombre`);
  await knex.raw(`ALTER TYPE rol_nombre_old RENAME TO rol_nombre`);
}
