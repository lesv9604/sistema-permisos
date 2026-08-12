import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // CORS: el frontend se sirve como sitio separado (otro origen).
  // En dev permitimos cualquier origen; en producción, definir CORS_ORIGIN.
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  // Prefijo global para toda la API REST.
  app.setGlobalPrefix('api');

  // Validación automática de TODOS los DTOs con class-validator.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades no declaradas en el DTO
      forbidNonWhitelisted: true, // rechaza propiedades extra
      transform: true, // convierte payloads a instancias tipadas
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Normaliza todos los errores a la forma { error, statusCode }.
  app.useGlobalFilters(new HttpExceptionFilter());

  // Permite cerrar el pool de Knex limpiamente al apagar la app.
  app.enableShutdownHooks();

  const puerto = Number(process.env.PORT ?? 3000);
  await app.listen(puerto);

  Logger.log(`API escuchando en http://localhost:${puerto}/api`, 'Bootstrap');
}

void bootstrap();
