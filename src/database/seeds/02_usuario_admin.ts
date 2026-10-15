import type { Knex } from 'knex';
import * as bcrypt from 'bcryptjs';

interface FilaRol {
  id: number;
}

/**
 * Crea el usuario ADMIN inicial a partir de las variables de entorno
 * (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, etc.). Es idempotente: si el email ya
 * existe, no lo duplica.
 *
 * Depende de que el seed de roles (`01_roles.ts`) se haya ejecutado antes,
 * ya que necesita el `id` del rol ADMIN.
 */
export async function seed(knex: Knex): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? 'admin@talentohumano.local';
  const enProduccion = process.env.NODE_ENV === 'production';
  if (enProduccion && !process.env.ADMIN_PASSWORD) {
    throw new Error(
      'ADMIN_PASSWORD es obligatorio en producción. No se usa la contraseña por defecto.',
    );
  }
  const password = process.env.ADMIN_PASSWORD ?? 'Admin123*';
  const nombre = process.env.ADMIN_NOMBRE ?? 'Administrador';
  const apellido = process.env.ADMIN_APELLIDO ?? 'Sistema';
  const cedula = process.env.ADMIN_CEDULA ?? '00000000';

  const rolAdmin = await knex<FilaRol>('roles')
    .select('id')
    .where('nombre', 'ADMIN')
    .first();

  if (!rolAdmin) {
    throw new Error(
      'No existe el rol ADMIN. Ejecuta primero el seed de roles (01_roles.ts).',
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await knex('usuarios')
    .insert({
      rol_id: rolAdmin.id,
      jefe_id: null,
      nombre,
      apellido,
      email,
      password_hash: passwordHash,
      cedula,
      escuela: 'Administración',
      dependencia: 'Rectoría',
      cargo: 'Administrador del sistema',
      activo: true,
    })
    .onConflict('email')
    .ignore();
}
