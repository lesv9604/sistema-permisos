import type { Knex } from 'knex';

/**
 * Tabla `solicitudes_permiso`: entidad central del sistema.
 * - `id` es UUID.
 * - `estado` es un enum nativo (`estado_solicitud`).
 * - `dias_habiles` se recalcula SIEMPRE en el backend (regla de negocio).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('solicitudes_permiso', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table
      .uuid('docente_id')
      .notNullable()
      .references('id')
      .inTable('usuarios')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    table
      .integer('tipo_permiso_id')
      .notNullable()
      .references('id')
      .inTable('tipos_permiso')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    table
      .enu(
        'estado',
        [
          'BORRADOR',
          'PENDIENTE_JEFE',
          'PENDIENTE_TALENTO_HUMANO',
          'APROBADA',
          'RECHAZADA',
          'CANCELADA',
        ],
        { useNative: true, enumName: 'estado_solicitud' },
      )
      .notNullable()
      .defaultTo('BORRADOR');

    table.date('fecha_inicio').notNullable();
    table.date('fecha_fin').notNullable();
    table.integer('dias_habiles').notNullable().defaultTo(0);
    table.text('motivo').nullable();
    table.text('observaciones').nullable();

    table
      .uuid('docente_sustituto_id')
      .nullable()
      .references('id')
      .inTable('usuarios')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');

    table.string('plan_trabajo_adjunto', 500).nullable();
    table.string('documento_soporte', 500).nullable();

    table.timestamps(true, true); // created_at, updated_at
    table.timestamp('submitted_at').nullable();

    table.index('docente_id', 'idx_solicitudes_docente_id');
    table.index('tipo_permiso_id', 'idx_solicitudes_tipo_permiso_id');
    table.index('estado', 'idx_solicitudes_estado');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('solicitudes_permiso');
  await knex.raw('DROP TYPE IF EXISTS estado_solicitud');
}
