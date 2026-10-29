import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { generarPasswordTemporal } from '../common/utils/password';
import { AuthService } from './auth.service';
import { PasswordTemporalGuard } from './guards/password-temporal.guard';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { PERMITIR_PASSWORD_TEMPORAL_KEY } from './decorators/permitir-password-temporal.decorator';

describe('generarPasswordTemporal', () => {
  it('genera contraseñas de 12 caracteres con todos los tipos y distintas', () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = generarPasswordTemporal();
      expect(p).toHaveLength(12);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/\d/);
      expect(p).toMatch(/[!@#$%*?]/);
      expect(p).not.toMatch(/[0O1lI]/);
      vistas.add(p);
    }
    expect(vistas.size).toBe(200);
  });
});

describe('PasswordTemporalGuard', () => {
  const ctx = (user: unknown) =>
    ({
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as never;
  const guard = (meta: Record<string, boolean>) =>
    new PasswordTemporalGuard({
      getAllAndOverride: (k: string) => meta[k],
    } as unknown as Reflector);

  it('deja pasar usuarios sin contraseña temporal', () => {
    expect(guard({}).canActivate(ctx({ debeCambiarPassword: false }))).toBe(true);
  });
  it('bloquea (403) si debe cambiar la contraseña', () => {
    expect(() => guard({}).canActivate(ctx({ debeCambiarPassword: true }))).toThrow(
      ForbiddenException,
    );
  });
  it('permite endpoints marcados o públicos', () => {
    const u = ctx({ debeCambiarPassword: true });
    expect(guard({ [PERMITIR_PASSWORD_TEMPORAL_KEY]: true }).canActivate(u)).toBe(true);
    expect(guard({ [IS_PUBLIC_KEY]: true }).canActivate(u)).toBe(true);
  });
});

describe('AuthService.cambiarPassword', () => {
  const hashActual = bcrypt.hashSync('Temporal#123', 4);
  const usuarios = {
    buscarPorId: jest.fn(),
    actualizarPassword: jest.fn(),
  };
  let service: AuthService;

  beforeEach(() => {
    usuarios.buscarPorId.mockResolvedValue({
      id: 'u1',
      activo: true,
      email: 'docente.prueba@unipaz.edu.co',
      cedula: '1098765',
      password_hash: hashActual,
      debe_cambiar_password: true,
    });
    usuarios.actualizarPassword.mockReset();
    service = new AuthService(usuarios as never, {} as never, {} as never);
    jest
      .spyOn(service as never, 'emitirSesion' as never)
      .mockResolvedValue({ ok: true } as never);
  });

  it('rechaza si la contraseña actual es incorrecta', async () => {
    await expect(
      service.cambiarPassword('u1', 'mala', 'NuevaClave2026'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rechaza contraseñas con la cédula o el usuario del correo', async () => {
    await expect(
      service.cambiarPassword('u1', 'Temporal#123', 'abc1098765x'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.cambiarPassword('u1', 'Temporal#123', 'Docente.Prueba99'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('guarda el nuevo hash y quita la marca de cambio obligatorio', async () => {
    await expect(
      service.cambiarPassword('u1', 'Temporal#123', 'NuevaClave2026'),
    ).resolves.toEqual({ ok: true });
    const [id, hash, debe] = usuarios.actualizarPassword.mock.calls[0];
    expect(id).toBe('u1');
    expect(bcrypt.compareSync('NuevaClave2026', hash)).toBe(true);
    expect(debe).toBe(false);
  });
});
