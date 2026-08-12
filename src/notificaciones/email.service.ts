import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

export interface EmailAEnviar {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
}

/**
 * Envío de email vía SendGrid. Si no hay `SENDGRID_API_KEY`, el envío se
 * SIMULA (solo se registra en el log), de modo que el resto del sistema
 * funciona en desarrollo sin credenciales reales.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private habilitado = false;
  private remitente = 'no-reply@talentohumano.local';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY')?.trim();
    this.remitente =
      this.config.get<string>('SENDGRID_FROM')?.trim() || this.remitente;

    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.habilitado = true;
      this.logger.log('SendGrid configurado: los emails se enviarán.');
    } else {
      this.logger.warn(
        'SENDGRID_API_KEY no definido: los emails se SIMULARÁN (solo log).',
      );
    }
  }

  /**
   * Envía un email. Nunca lanza: un fallo de email no debe romper el flujo de
   * negocio (la notificación in-app ya quedó persistida). Devuelve true si se
   * envió/simuló correctamente.
   */
  async enviar(email: EmailAEnviar): Promise<boolean> {
    if (!this.habilitado) {
      this.logger.log(
        `[email simulado] -> ${email.para} | ${email.asunto}`,
      );
      return true;
    }

    try {
      await sgMail.send({
        to: email.para,
        from: this.remitente,
        subject: email.asunto,
        text: email.texto,
        html: email.html ?? `<p>${email.texto}</p>`,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Fallo al enviar email a ${email.para}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
