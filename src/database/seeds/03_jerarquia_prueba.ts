import type { Knex } from 'knex';
import * as bcrypt from 'bcryptjs';

/**
 * Siembra la jerarquía de aprobación de prueba para el nuevo flujo con Jefe
 * de Escuela. Idempotente (upsert por email). Password de todos: "Demo123*".
 *
 * - Un Jefe de Escuela y un Jefe Inmediato.
 * - docente.uno: jefe_id y jefe_escuela_id DISTINTOS (flujo normal de 2 niveles).
 * - docente.dos: jefe_id y jefe_escuela_id apuntan al MISMO usuario
 *   (para probar más adelante la regla de "misma persona").
 */
export async function seed(knex: Knex): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('03_jerarquia_prueba omitido: no se siembran usuarios demo en producción.');
    return;
  }

  const roles = await knex('roles').select('id', 'nombre');
  const rolId = (nombre: string): number =>
    roles.find((r: { nombre: string }) => r.nombre === nombre).id;

  const passwordHash = await bcrypt.hash('Demo123*', 10);

  async function upsertUsuario(datos: {
    email: string;
    rol: string;
    nombre: string;
    apellido: string;
    cedula: string;
    escuela: string;
    cargo: string;
    jefe_id?: string | null;
    jefe_escuela_id?: string | null;
  }): Promise<string> {
    const comun = {
      rol_id: rolId(datos.rol),
      nombre: datos.nombre,
      apellido: datos.apellido,
      cedula: datos.cedula,
      escuela: datos.escuela,
      cargo: datos.cargo,
      jefe_id: datos.jefe_id ?? null,
      jefe_escuela_id: datos.jefe_escuela_id ?? null,
      activo: true,
    };

    const existente = await knex('usuarios')
      .select('id')
      .where('email', datos.email)
      .first();

    if (existente) {
      await knex('usuarios').where('id', existente.id).update(comun);
      return existente.id;
    }

    const [fila] = await knex('usuarios')
      .insert({ ...comun, email: datos.email, password_hash: passwordHash })
      .returning('id');
    return fila.id;
  }

  // Jefes (sin superior).
  const jefeEscuelaId = await upsertUsuario({
    email: 'jefe.escuela@demo.local',
    rol: 'JEFE_ESCUELA',
    nombre: 'Esteban',
    apellido: 'Escuela',
    cedula: 'D-JESC',
    escuela: 'Ciencias',
    cargo: 'Jefe de Escuela',
  });

  const jefeInmediatoId = await upsertUsuario({
    email: 'jefe.inmediato@demo.local',
    rol: 'JEFE_INMEDIATO',
    nombre: 'Ignacio',
    apellido: 'Inmediato',
    cedula: 'D-JINM',
    escuela: 'Ciencias',
    cargo: 'Jefe Inmediato',
  });

  // Docente 1: jefe inmediato y jefe de escuela DISTINTOS.
  await upsertUsuario({
    email: 'docente.uno@demo.local',
    rol: 'DOCENTE',
    nombre: 'Diana',
    apellido: 'Uno',
    cedula: 'D-DOC1',
    escuela: 'Ciencias',
    cargo: 'Docente',
    jefe_id: jefeInmediatoId,
    jefe_escuela_id: jefeEscuelaId,
  });

  // Docente 2: jefe inmediato y jefe de escuela son el MISMO usuario.
  await upsertUsuario({
    email: 'docente.dos@demo.local',
    rol: 'DOCENTE',
    nombre: 'David',
    apellido: 'Dos',
    cedula: 'D-DOC2',
    escuela: 'Ciencias',
    cargo: 'Docente',
    jefe_id: jefeEscuelaId,
    jefe_escuela_id: jefeEscuelaId,
  });
}
