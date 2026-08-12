import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global que normaliza TODAS las respuestas de error a la forma
 * `{ error, statusCode }` definida en el CLAUDE.md.
 *
 * - Si es una `HttpException`, respeta su status y mensaje.
 * - Si es un error inesperado, devuelve 500 sin filtrar detalles internos.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const error = this.extraerMensaje(exception, statusCode);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({ error, statusCode });
  }

  private extraerMensaje(exception: unknown, statusCode: number): string {
    if (exception instanceof HttpException) {
      const respuesta = exception.getResponse();
      if (typeof respuesta === 'string') {
        return respuesta;
      }
      if (respuesta && typeof respuesta === 'object') {
        const mensaje = (respuesta as { message?: string | string[] }).message;
        if (Array.isArray(mensaje)) {
          return mensaje.join('; ');
        }
        if (typeof mensaje === 'string') {
          return mensaje;
        }
      }
      return exception.message;
    }

    return statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
      ? 'Error interno del servidor'
      : 'Error en la solicitud';
  }
}
