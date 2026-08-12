import {
  ContextoCarga,
  FilaUsuarioCsv,
  parsearCsvUsuarios,
  prepararUsuarios,
} from './carga-masiva';

function ctxBase(): ContextoCarga {
  return {
    rolesPorNombre: new Map([
      ['DOCENTE', 1],
      ['JEFE_INMEDIATO', 2],
      ['JEFE_ESCUELA', 3],
      ['TALENTO_HUMANO', 4],
      ['ADMIN', 5],
    ]),
    emailsExistentes: new Set(['existe@x.com']),
    cedulasExistentes: new Set(['CED-EXISTE']),
  };
}

function fila(over: Partial<FilaUsuarioCsv> = {}): FilaUsuarioCsv {
  return {
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'ana@x.com',
    cedula: 'CED-1',
    rol: 'DOCENTE',
    ...over,
  };
}

describe('parsearCsvUsuarios', () => {
  it('parsea filas y respeta columnas opcionales', () => {
    const csv =
      'nombre,apellido,email,cedula,escuela,dependencia,cargo,rol,email_jefe_inmediato,email_jefe_escuela\n' +
      'Ana, Pérez , ana@x.com, C1 , Ciencias, Vicerrectoría, Docente, DOCENTE, jefe.inm@x.com,';
    const filas = parsearCsvUsuarios(csv);
    expect(filas).toHaveLength(1);
    expect(filas[0].nombre).toBe('Ana');
    expect(filas[0].cedula).toBe('C1');
    expect(filas[0].escuela).toBe('Ciencias');
    expect(filas[0].dependencia).toBe('Vicerrectoría');
    expect(filas[0].email_jefe_inmediato).toBe('jefe.inm@x.com');
    expect(filas[0].email_jefe_escuela).toBeUndefined();
  });

  it('lanza si falta una columna obligatoria', () => {
    const csv = 'nombre,apellido,email,cedula\nAna,Pérez,ana@x.com,C1';
    expect(() => parsearCsvUsuarios(csv)).toThrow(/obligatorias/i);
  });

  it('lanza si no hay filas de datos', () => {
    const csv = 'nombre,apellido,email,cedula,rol';
    expect(() => parsearCsvUsuarios(csv)).toThrow(/no contiene filas/i);
  });
});

describe('prepararUsuarios', () => {
  it('mapea el nombre del rol a su rol_id (sin distinguir mayúsculas)', () => {
    const r = prepararUsuarios(
      [fila({ rol: 'docente' }), fila({ email: 'b@x.com', cedula: 'C2', rol: 'ADMIN' })],
      ctxBase(),
    );
    expect(r[0].rol_id).toBe(1);
    expect(r[1].rol_id).toBe(5);
  });

  it('lanza con el número de fila si el rol no existe', () => {
    expect(() =>
      prepararUsuarios([fila({ rol: 'INVENTADO' })], ctxBase()),
    ).toThrow(/Fila 2:.*rol "INVENTADO" no es válido/i);
  });

  it('arrastra los emails de los jefes (en minúsculas) sin resolverlos', () => {
    const r = prepararUsuarios(
      [
        fila({
          email_jefe_inmediato: 'Jefe.Inm@X.com',
          email_jefe_escuela: 'jefe.esc@x.com',
        }),
      ],
      ctxBase(),
    );
    expect(r[0].email_jefe_inmediato).toBe('jefe.inm@x.com');
    expect(r[0].email_jefe_escuela).toBe('jefe.esc@x.com');
  });

  it('deja los emails de jefe en null si no se indican', () => {
    const r = prepararUsuarios([fila()], ctxBase());
    expect(r[0].email_jefe_inmediato).toBeNull();
    expect(r[0].email_jefe_escuela).toBeNull();
  });

  it('lanza si el email ya existe en la BD', () => {
    expect(() =>
      prepararUsuarios([fila({ email: 'existe@x.com' })], ctxBase()),
    ).toThrow(/Fila 2:.*ya existe/i);
  });

  it('lanza si la cédula ya existe en la BD', () => {
    expect(() =>
      prepararUsuarios([fila({ cedula: 'CED-EXISTE' })], ctxBase()),
    ).toThrow(/Fila 2:.*cédula.*ya existe/i);
  });

  it('detecta emails duplicados dentro del mismo CSV', () => {
    expect(() =>
      prepararUsuarios(
        [fila(), fila({ cedula: 'C2' })], // mismo email
        ctxBase(),
      ),
    ).toThrow(/Fila 3:.*ya existe/i);
  });

  it('lanza si falta un campo obligatorio', () => {
    expect(() =>
      prepararUsuarios([fila({ nombre: '' })], ctxBase()),
    ).toThrow(/Fila 2:.*falta el nombre/i);
  });

  it('lanza si el email tiene formato inválido', () => {
    expect(() =>
      prepararUsuarios([fila({ email: 'no-es-email' })], ctxBase()),
    ).toThrow(/Fila 2:.*no es válido/i);
  });
});
