import { ForbiddenException } from '@nestjs/common';
import { Rol } from '../common/enums/rol.enum';
import { DefinicionTransicion } from './transiciones';

export interface ActorAccion {
  id: string;
  rol: Rol;
}

export interface DocenteJerarquia {
  jefe_id: string | null;
  jefe_escuela_id: string | null;
}

/**
 * Verifica que `actor` tenga autoridad para ejecutar la transición `def`
 * sobre la solicitud de un docente. Lanza `ForbiddenException` si no procede.
 * Función PURA (sin IO): la fuente de la autoridad es la definición de la
 * transición y la jerarquía del docente. ADMIN omite las comprobaciones de
 * nivel (pero no las de propiedad).
 */
export function verificarAutoridad(
  actor: ActorAccion,
  def: DefinicionTransicion,
  docenteId: string,
  docente: DocenteJerarquia,
): void {
  const esAdmin = actor.rol === Rol.ADMIN;

  if (def.requiereSerDueno && docenteId !== actor.id) {
    throw new ForbiddenException(
      'Solo el docente dueño puede realizar esta acción.',
    );
  }

  if (
    def.requiereSerJefeEscuela &&
    !esAdmin &&
    docente.jefe_escuela_id !== actor.id
  ) {
    throw new ForbiddenException(
      'Solo el Jefe de Escuela del docente puede actuar en este nivel.',
    );
  }

  if (def.requiereSerJefeInmediato && !esAdmin && docente.jefe_id !== actor.id) {
    throw new ForbiddenException(
      'Solo el Jefe Inmediato del docente puede actuar en este nivel.',
    );
  }

  if (
    def.rolesPermitidos.length > 0 &&
    !esAdmin &&
    !def.rolesPermitidos.includes(actor.rol)
  ) {
    throw new ForbiddenException(
      'Tu rol no puede realizar esta acción sobre la solicitud.',
    );
  }
}
