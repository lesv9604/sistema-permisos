import type { Knex } from 'knex';

type NombreRol =
  | 'DOCENTE'
  | 'JEFE_INMEDIATO'
  | 'JEFE_ESCUELA'
  | 'TALENTO_HUMANO'
  | 'ADMIN';

interface RolSeed {
  nombre: NombreRol;
  descripcion: string;
}

const ROLES: RolSeed[] = [
  { nombre: 'DOCENTE', descripcion: 'Docente que solicita permisos laborales.' },
  {
    nombre: 'JEFE_INMEDIATO',
    descripcion: 'Aprueba el nivel de jefe inmediato de su equipo.',
  },
  {
    nombre: 'JEFE_ESCUELA',
    descripcion: 'Aprueba el primer nivel (Jefe de Escuela) de la solicitud.',
  },
  {
    nombre: 'TALENTO_HUMANO',
    descripcion: 'Aprueba el nivel de Talento Humano y gestiona reportes.',
  },
  {
    nombre: 'ADMIN',
    descripcion: 'Administrador del sistema con acceso total.',
  },
];

/**
 * Inserta los 4 roles básicos. Es idempotente: si un rol ya existe
 * (por su nombre único), no lo duplica.
 */
export async function seed(knex: Knex): Promise<void> {
  await knex('roles')
    .insert(ROLES)
    .onConflict('nombre')
    .ignore();
}
