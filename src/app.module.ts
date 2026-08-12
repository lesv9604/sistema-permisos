import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TiposPermisoModule } from './tipos-permiso/tipos-permiso.module';
import { PermisosModule } from './permisos/permisos.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { ReportesModule } from './reportes/reportes.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    // Carga las variables de entorno desde `.env` de forma global.
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Sirve el frontend compilado (frontend/dist) desde el propio backend, de
    // modo que toda la app quede disponible en http://localhost:3000. Se
    // EXCLUYE /api para no interferir con las rutas de la API REST.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      exclude: ['/api/{*path}'],
    }),

    DatabaseModule,
    AuthModule,
    UsuariosModule,
    TiposPermisoModule,
    PermisosModule,
    NotificacionesModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Orden importante: primero autentica (JwtAuthGuard), luego autoriza por
    // rol (RolesGuard). Aplican a TODA la API salvo endpoints @Public().
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
