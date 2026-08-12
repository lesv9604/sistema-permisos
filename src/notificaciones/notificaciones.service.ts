import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.constants';
import { EmailService } from './email.service';
import { NotificacionesGateway } from './notificaciones.gateway';
import {
  Notificacion,
  NuevaNotificacion,
  TipoNotificacion,
} from './interfaces/notificacion.interface';

/** Tipos de notificación que además disparan email. */
const TIPOS_CON_EMAIL: ReadonlySet<string> = new Set([
  TipoNotificacion.SOLICITUD_PENDIENTE,
  TipoNotificacion.SOLICITUD_APROBADA,
  TipoNotificacion.SOLICITUD_RECHAZADA,
]);

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly gateway: NotificacionesGateway,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Persiste varias notificaciones DENTRO de la transacción recibida (`trx`),
   * para que se confirmen junto al cambio de estado. Devuelve las filas
   * creadas (con id) para despacharlas DESPUÉS del commit.
   */
  async crearVarias(
    trx: Knex,
    notificaciones: NuevaNotificacion[],
  ): Promise<Notificacion[]> {
    if (notificaciones.length === 0) {
      return [];
    }
    return trx<Notificacion>('notificaciones')
      .insert(
        notificaciones.map((n) => ({
          usuario_id: n.usuario_id,
          solicitud_id: n.solicitud_id ?? null,
          tipo: n.tipo,
          titulo: n.titulo,
          mensaje: n.mensaje,
        })),
      )
      .returning('*');
  }

  /**
   * Despacha (tiempo real + email) las notificaciones ya persistidas. Se llama
   * DESPUÉS de que la transacción haya hecho commit. Nunca lanza: un fallo de
   * entrega no debe afectar al flujo de negocio.
   */
  async despachar(notificaciones: Notificacion[]): Promise<void> {
    if (notificaciones.length === 0) {
      return;
    }
    try {
      // 1) Tiempo real (Socket.io) a cada destinatario.
      for (const n of notificaciones) {
        this.gateway.enviarAUsuario(n.usuario_id, n);
      }

      // 2) Email para los tipos relevantes.
      const conEmail = notificaciones.filter((n) => TIPOS_CON_EMAIL.has(n.tipo));
      if (conEmail.length > 0) {
        await this.enviarEmails(conEmail);
      }
    } catch (error) {
      this.logger.error(
        `Fallo despachando notificaciones: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Lista las notificaciones del usuario (aislamiento: solo las suyas). */
  async listar(
    usuarioId: string,
    soloNoLeidas = false,
  ): Promise<Notificacion[]> {
    const query = this.knex<Notificacion>('notificaciones')
      .where('usuario_id', usuarioId)
      .orderBy('created_at', 'desc');
    if (soloNoLeidas) {
      query.where('leida', false);
    }
    return query;
  }

  async conteoNoLeidas(usuarioId: string): Promise<number> {
    const fila = await this.knex('notificaciones')
      .where('usuario_id', usuarioId)
      .where('leida', false)
      .count<{ n: string }>('* as n')
      .first();
    return Number(fila?.n ?? 0);
  }

  /** Marca una notificación propia como leída. */
  async marcarLeida(usuarioId: string, id: number): Promise<Notificacion> {
    const [actualizada] = await this.knex<Notificacion>('notificaciones')
      .where('id', id)
      .where('usuario_id', usuarioId)
      .update({ leida: true })
      .returning('*');
    if (!actualizada) {
      throw new NotFoundException('La notificación no existe.');
    }
    return actualizada;
  }

  /** Marca todas las notificaciones del usuario como leídas. */
  async marcarTodasLeidas(usuarioId: string): Promise<{ actualizadas: number }> {
    const actualizadas = await this.knex('notificaciones')
      .where('usuario_id', usuarioId)
      .where('leida', false)
      .update({ leida: true });
    return { actualizadas };
  }

  private async enviarEmails(notificaciones: Notificacion[]): Promise<void> {
    const ids = [...new Set(notificaciones.map((n) => n.usuario_id))];
    const usuarios = await this.knex('usuarios')
      .whereIn('id', ids)
      .select('id', 'email');
    const emailPorId = new Map<string, string>(
      usuarios.map((u: { id: string; email: string }) => [u.id, u.email]),
    );

    await Promise.all(
      notificaciones.map((n) => {
        const para = emailPorId.get(n.usuario_id);
        if (!para) {
          return Promise.resolve(false);
        }
        return this.emailService.enviar({
          para,
          asunto: n.titulo,
          texto: n.mensaje,
        });
      }),
    );
  }
}
