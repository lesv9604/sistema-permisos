import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Rol } from '../common/enums/rol.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportesService } from './reportes.service';
import { FiltrosReporteDto } from './dto/filtros-reporte.dto';

/** Reportes y exportación. Solo Talento Humano y Admin (RBAC del CLAUDE.md). */
@Roles(Rol.TALENTO_HUMANO, Rol.ADMIN)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  /** GET /api/reportes/resumen — métricas agregadas. */
  @Get('resumen')
  async resumen(@Query() filtros: FiltrosReporteDto) {
    const data = await this.reportesService.resumen(filtros);
    return { data, message: 'Resumen de solicitudes' };
  }

  /** GET /api/reportes/solicitudes — listado detallado (JSON). */
  @Get('solicitudes')
  async detalle(@Query() filtros: FiltrosReporteDto) {
    const data = await this.reportesService.detalle(filtros);
    return { data, message: 'Detalle de solicitudes' };
  }

  /** GET /api/reportes/solicitudes.csv — exporta el detalle a CSV. */
  @Get('solicitudes.csv')
  async csv(
    @Query() filtros: FiltrosReporteDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.reportesService.generarCsv(filtros);
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte-permisos-${fecha}.csv"`,
    );
    res.send(csv);
  }
}
