import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/interfaces/jwt.interface';
import { Notificacion } from './interfaces/notificacion.interface';

/**
 * Gateway de notificaciones en tiempo real. Cada cliente autentica con su
 * ACCESS token (en `handshake.auth.token`, header Authorization o query
 * `?token=`) y se une a una sala privada `usuario:<id>`. Las notificaciones se
 * emiten solo a la sala del destinatario (aislamiento).
 */
@WebSocketGateway({
  cors: { origin: process.env.SOCKET_CORS_ORIGIN ?? '*' },
})
export class NotificacionesGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificacionesGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extraerToken(client);
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      client.data.usuarioId = payload.sub;
      await client.join(this.sala(payload.sub));
      this.logger.log(`WS conectado: usuario ${payload.sub}`);
    } catch {
      client.emit('error_autenticacion', 'Token inválido o ausente.');
      client.disconnect(true);
    }
  }

  /** Emite una notificación en tiempo real al usuario destinatario. */
  enviarAUsuario(usuarioId: string, notificacion: Notificacion): void {
    if (!this.server) {
      return;
    }
    this.server.to(this.sala(usuarioId)).emit('notificacion', notificacion);
  }

  private sala(usuarioId: string): string {
    return `usuario:${usuarioId}`;
  }

  private extraerToken(client: Socket): string {
    const desdeAuth = client.handshake.auth?.token as string | undefined;
    if (desdeAuth) {
      return desdeAuth.replace(/^Bearer\s+/i, '').trim();
    }
    const header = client.handshake.headers.authorization;
    if (header) {
      return header.replace(/^Bearer\s+/i, '').trim();
    }
    const query = client.handshake.query?.token;
    if (typeof query === 'string' && query) {
      return query;
    }
    throw new Error('Token ausente');
  }
}
