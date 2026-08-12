# CLAUDE.md — Sistema de Gestión de Talento Humano (Sector Educativo)

> Este archivo lo lee Claude Code automáticamente al inicio de cada sesión.
> Contiene las reglas y el contexto permanente del proyecto. NO lo borres.

## 1. Qué es este proyecto

Aplicación web para que **docentes** soliciten **permisos laborales**, con un
**flujo de aprobación de dos niveles** (Jefe Inmediato → Talento Humano) y
**trazabilidad histórica** completa de cada acción.

Sector: instituciones educativas.

## 2. Stack tecnológico (NO cambiar sin pedírmelo)

- **Backend:** NestJS (Node.js 20 LTS) + TypeScript
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + React Query
- **Base de datos:** PostgreSQL (alojada en Supabase)
- **ORM / Query builder:** Knex.js para migraciones y queries
- **Auth:** JWT (access token 15 min + refresh token 7 días)
- **Notificaciones:** SendGrid (email) + Socket.io (in-app en tiempo real)
- **Hosting:** Hostinger Cloud (backend y frontend como sitios separados)

## 3. Estructura del repositorio (monorepo)

```
talento-humano/
├── backend/          # API NestJS
│   ├── src/
│   │   ├── auth/         # Login, JWT, guards, RBAC
│   │   ├── usuarios/     # Docentes y personal
│   │   ├── permisos/     # Solicitudes + flujo de estados
│   │   ├── notificaciones/
│   │   ├── common/       # Decoradores, filtros, pipes compartidos
│   │   └── database/     # Migraciones Knex + seeds
│   └── package.json
├── frontend/         # SPA React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/    # Llamadas a la API (axios + React Query)
│   │   └── types/
│   └── package.json
└── CLAUDE.md
```

## 4. Comandos del proyecto

Backend (desde `/backend`):
- `npm run start:dev` — desarrollo con hot reload
- `npm run build` — compila a `/dist`
- `npm run start:prod` — ejecuta `dist/main.js`
- `npm run migrate` — corre migraciones Knex
- `npm run seed` — datos de prueba
- `npm run test` — tests unitarios

Frontend (desde `/frontend`):
- `npm run dev` — servidor Vite
- `npm run build` — compila a `/dist`
- `npm run lint` — ESLint

## 5. Modelo de datos (tablas principales)

- **roles** — DOCENTE, JEFE_INMEDIATO, TALENTO_HUMANO, ADMIN
- **usuarios** — incluye `jefe_id` (autorreferencia para la jerarquía)
- **tipos_permiso** — catálogo configurable (médico, calamidad, personal, etc.)
- **solicitudes_permiso** — entidad central, con `estado` (enum)
- **historial_aprobaciones** — registro INMUTABLE de cada acción (auditoría)
- **notificaciones** — alertas in-app

### Estados de una solicitud (enum `estado_solicitud`)
`BORRADOR → PENDIENTE_JEFE → PENDIENTE_TALENTO_HUMANO → APROBADA | RECHAZADA`
(también existe `CANCELADA`)

## 6. Reglas de negocio que SIEMPRE debes respetar

1. **Aislamiento de datos:** un DOCENTE solo puede ver/editar SUS propias
   solicitudes. Validar SIEMPRE la propiedad del recurso en el servicio, no
   solo en el guard.
2. **historial_aprobaciones es inmutable:** nunca hagas UPDATE ni DELETE sobre
   esa tabla. Solo INSERT.
3. **Transiciones de estado validadas:** usa la tabla `TRANSICIONES_VALIDAS`.
   Rechaza cualquier transición no permitida con un error de negocio.
4. **Días hábiles se recalculan en el backend.** Nunca confíes en el valor
   enviado por el cliente.
5. **Toda transición de estado debe:** (a) ocurrir dentro de una transacción de
   BD, (b) registrar una fila en `historial_aprobaciones`, (c) disparar la
   notificación correspondiente.
6. **Secretos en `.env`** (chmod 600). Nunca los subas a Git. Existe un
   `.env.example` con las claves sin valores.

## 7. RBAC — quién puede hacer qué

| Acción                          | Docente | Jefe | Talento Humano | Admin |
|---------------------------------|:-------:|:----:|:--------------:|:-----:|
| Crear solicitud propia          |   Sí    | Sí   |      Sí        |  Sí   |
| Ver solicitudes de subordinados |   No    | Sí   |      Sí        |  Sí   |
| Aprobar nivel 1 (Jefe)          |   No    | Sí   |      No        |  Sí   |
| Aprobar nivel 2 (TH)            |   No    | No   |      Sí        |  Sí   |
| Gestionar tipos de permiso      |   No    | No   |      No        |  Sí   |
| Exportar reportes               |   No    | No   |      Sí        |  Sí   |
| Crear/editar usuarios           |   No    | No   |      No        |  Sí   |

## 8. Convenciones de código

- Nombres de variables, funciones y comentarios en **español** (dominio de
  negocio en español); nombres de librerías/frameworks como vienen.
- DTOs con `class-validator` para validar TODO input.
- Endpoints REST bajo el prefijo `/api`.
- Respuestas de API con forma `{ data, message }` y errores `{ error, statusCode }`.
- Tests para toda lógica de negocio del flujo de aprobación.
- Commits en formato Conventional Commits (`feat:`, `fix:`, `chore:`...).

## 9. Cómo trabajamos

- Construimos por módulos, en este orden: **(1) base de datos + migraciones →
  (2) auth/RBAC → (3) CRUD de permisos → (4) flujo de aprobación →
  (5) notificaciones → (6) frontend.**
- Antes de escribir un módulo nuevo, revisa cómo está hecho el anterior para
  mantener consistencia.
- Si una instrucción mía contradice este archivo, pregúntame antes de continuar.