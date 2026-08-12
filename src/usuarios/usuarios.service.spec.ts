import * as bcrypt from 'bcryptjs';
import { Knex } from 'knex';
import { UsuariosService } from './usuarios.service';

interface FilaDb {
  id: string;
  email: string;
  jefe_id: string | null;
  jefe_escuela_id: string | null;
}

interface OpcionesMock {
  roles: { id: number; nombre: string }[];
  /** Usuarios que ya existen en la BD antes de la carga. */
  existentes?: { id: string; email: string; cedula: string }[];
}

/**
 * Mock de Knex que simula el algoritmo de DOS FASES: insert (asigna id y guarda
 * en un "BD en memoria"), whereIn(...).select(...) para resolver jefes, y
 * where(email).update(...) para enlazar. Así podemos verificar que un jefe que
 * aparece MÁS ADELANTE en el array se resuelve por email.
 */
function mockKnex(op: OpcionesMock) {
  const inserts: any[] = [];
  const updates: { email: string | null; cambios: any }[] = [];
  const db = new Map<string, FilaDb>();
  let idCounter = 0;

  for (const e of op.existentes ?? []) {
    db.set(e.email.toLowerCase(), {
      id: e.id,
      email: e.email,
      jefe_id: null,
      jefe_escuela_id: null,
    });
  }

  // Builder fuera de transacción (solo lecturas de roles/usuarios).
  const fn: any = (tabla: string) => ({
    select: () =>
      Promise.resolve(
        tabla === 'roles'
          ? op.roles
          : tabla === 'usuarios'
            ? (op.existentes ?? []).map((u) => ({ email: u.email, cedula: u.cedula }))
            : [],
      ),
  });

  fn.transaction = async (cb: (trx: any) => Promise<unknown>) => {
    const trx: any = () => {
      let whereInVals: string[] | null = null;
      let whereEmail: string | null = null;
      const builder: any = {
        insert: (obj: any) => {
          const id = `id-${++idCounter}`;
          inserts.push({ ...obj, id });
          db.set(String(obj.email).toLowerCase(), {
            id,
            email: obj.email,
            jefe_id: obj.jefe_id ?? null,
            jefe_escuela_id: obj.jefe_escuela_id ?? null,
          });
          return Promise.resolve([id]);
        },
        whereIn: (_col: string, vals: string[]) => {
          whereInVals = vals;
          return builder;
        },
        where: (_col: string, val: string) => {
          whereEmail = String(val).toLowerCase();
          return builder;
        },
        select: () => {
          const vals = (whereInVals ?? []).map((v) => v.toLowerCase());
          const rows = [...db.values()]
            .filter((r) => vals.includes(r.email.toLowerCase()))
            .map((r) => ({ id: r.id, email: r.email }));
          return Promise.resolve(rows);
        },
        update: (cambios: any) => {
          const row = whereEmail ? db.get(whereEmail) : null;
          if (row) Object.assign(row, cambios);
          updates.push({ email: whereEmail, cambios });
          return Promise.resolve(1);
        },
      };
      return builder;
    };
    return cb(trx);
  };

  return { knex: fn as Knex, inserts, updates, db };
}

const ROLES = [
  { id: 1, nombre: 'DOCENTE' },
  { id: 2, nombre: 'JEFE_INMEDIATO' },
  { id: 3, nombre: 'JEFE_ESCUELA' },
];

const CABECERAS =
  'nombre,apellido,email,cedula,escuela,dependencia,cargo,rol,email_jefe_inmediato,email_jefe_escuela';

describe('UsuariosService.cargaMasiva (dos fases)', () => {
  it('resuelve un jefe que aparece MÁS ADELANTE en el mismo CSV', async () => {
    // El docente (fila 1) referencia a un jefe definido en la fila 2.
    const csv =
      `${CABECERAS}\n` +
      'Diana,Doc,diana@x.com,C-D,Ciencias,,Docente,DOCENTE,ignacio@x.com,esteban@x.com\n' +
      'Ignacio,Jefe,ignacio@x.com,C-I,Ciencias,,Jefe Inmediato,JEFE_INMEDIATO,,\n' +
      'Esteban,Escuela,esteban@x.com,C-E,Ciencias,,Jefe de Escuela,JEFE_ESCUELA,,';
    const { knex, inserts, db } = mockKnex({ roles: ROLES });
    const svc = new UsuariosService(knex);

    const res = await svc.cargaMasiva(csv);

    expect(res).toEqual({ creados: 3 });
    // Fase 1: todos insertados con jefes en null.
    expect(inserts).toHaveLength(3);
    expect(inserts.every((i) => i.jefe_id === null && i.jefe_escuela_id === null)).toBe(true);
    // Fase 2: la jerarquía de Diana quedó enlazada a los ids reales.
    const diana = db.get('diana@x.com')!;
    expect(diana.jefe_id).toBe(db.get('ignacio@x.com')!.id);
    expect(diana.jefe_escuela_id).toBe(db.get('esteban@x.com')!.id);
  });

  it('resuelve un jefe que YA existía en la base de datos', async () => {
    const csv =
      `${CABECERAS}\n` +
      'Diana,Doc,diana@x.com,C-D,Ciencias,,Docente,DOCENTE,viejo.jefe@x.com,';
    const { knex, db } = mockKnex({
      roles: ROLES,
      existentes: [{ id: 'uuid-viejo', email: 'viejo.jefe@x.com', cedula: 'C-V' }],
    });
    const svc = new UsuariosService(knex);

    await svc.cargaMasiva(csv);
    expect(db.get('diana@x.com')!.jefe_id).toBe('uuid-viejo');
  });

  it('usa la cédula como password (hasheada)', async () => {
    const csv =
      `${CABECERAS}\n` +
      'Ana,Pérez,ana@x.com,C1,Ciencias,,Docente,DOCENTE,,';
    const { knex, inserts } = mockKnex({ roles: ROLES });
    const svc = new UsuariosService(knex);

    await svc.cargaMasiva(csv);
    expect(bcrypt.compareSync('C1', inserts[0].password_hash)).toBe(true);
  });

  it('lanza (rollback) si un email de jefe no existe ni en la BD ni en el CSV', async () => {
    const csv =
      `${CABECERAS}\n` +
      'Diana,Doc,diana@x.com,C-D,Ciencias,,Docente,DOCENTE,fantasma@x.com,';
    const { knex } = mockKnex({ roles: ROLES });
    const svc = new UsuariosService(knex);

    await expect(svc.cargaMasiva(csv)).rejects.toThrow(/fantasma@x.com/i);
  });

  it('rol inexistente → no inserta nada (validación previa a la transacción)', async () => {
    const csv =
      `${CABECERAS}\n` +
      'Ana,Pérez,ana@x.com,C1,Ciencias,,Docente,NO_EXISTE,,';
    const { knex, inserts } = mockKnex({ roles: ROLES });
    const svc = new UsuariosService(knex);

    await expect(svc.cargaMasiva(csv)).rejects.toThrow(/Fila 2:.*NO_EXISTE/i);
    expect(inserts).toHaveLength(0);
  });

  it('email duplicado dentro del CSV → no inserta nada', async () => {
    const csv =
      `${CABECERAS}\n` +
      'Ana,Pérez,dup@x.com,C1,Ciencias,,Docente,DOCENTE,,\n' +
      'Otra,Persona,dup@x.com,C2,Ciencias,,Docente,DOCENTE,,';
    const { knex, inserts } = mockKnex({ roles: ROLES });
    const svc = new UsuariosService(knex);

    await expect(svc.cargaMasiva(csv)).rejects.toThrow(/ya existe/i);
    expect(inserts).toHaveLength(0);
  });
});
