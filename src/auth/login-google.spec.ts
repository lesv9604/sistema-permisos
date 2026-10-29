import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

/**
 * Pruebas de AuthService.loginGoogle: se simula la verificación del ID
 * token de Google (no hay red) y se valida la lógica de dominio y
 * pre-registro.
 */
describe("AuthService.loginGoogle", () => {
  const env: Record<string, string | undefined> = {
    GOOGLE_CLIENT_ID: "cliente-test.apps.googleusercontent.com",
    GOOGLE_ALLOWED_DOMAIN: "unipaz.edu.co",
  };
  const config = { get: (k: string) => env[k] } as never;
  const usuariosService = { buscarPorEmail: jest.fn() };
  let service: AuthService;
  let verifyIdToken: jest.Mock;
  let emitir: jest.SpyInstance;

  const payload = (p: Record<string, unknown>) =>
    verifyIdToken.mockResolvedValue({ getPayload: () => p });

  beforeEach(() => {
    env.GOOGLE_CLIENT_ID = "cliente-test.apps.googleusercontent.com";
    env.GOOGLE_ALLOWED_DOMAIN = "unipaz.edu.co";
    usuariosService.buscarPorEmail.mockReset();
    service = new AuthService(usuariosService as never, {} as never, config);
    verifyIdToken = jest.fn();
    (service as unknown as { google: { verifyIdToken: jest.Mock } }).google = {
      verifyIdToken,
    };
    emitir = jest
      .spyOn(service as never, "emitirSesion" as never)
      .mockResolvedValue({ ok: true } as never);
  });

  it("devuelve 404 si Google no está configurado", async () => {
    env.GOOGLE_CLIENT_ID = "";
    await expect(service.loginGoogle("x")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rechaza un token inválido", async () => {
    verifyIdToken.mockRejectedValue(new Error("firma inválida"));
    await expect(service.loginGoogle("x")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rechaza cuentas de otro dominio", async () => {
    payload({ email: "alguien@gmail.com", email_verified: true });
    await expect(service.loginGoogle("x")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(usuariosService.buscarPorEmail).not.toHaveBeenCalled();
  });

  it("rechaza email no verificado", async () => {
    payload({
      email: "a@unipaz.edu.co",
      email_verified: false,
      hd: "unipaz.edu.co",
    });
    await expect(service.loginGoogle("x")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rechaza usuarios no registrados o inactivos", async () => {
    payload({
      email: "A@unipaz.edu.co",
      email_verified: true,
      hd: "unipaz.edu.co",
    });
    usuariosService.buscarPorEmail.mockResolvedValueOnce(undefined);
    await expect(service.loginGoogle("x")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    usuariosService.buscarPorEmail.mockResolvedValueOnce({ activo: false });
    await expect(service.loginGoogle("x")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("emite sesión para usuario institucional registrado y activo", async () => {
    payload({
      email: "Docente@UNIPAZ.edu.co",
      email_verified: true,
      hd: "unipaz.edu.co",
    });
    usuariosService.buscarPorEmail.mockResolvedValue({ id: "1", activo: true });
    await expect(service.loginGoogle("x")).resolves.toEqual({ ok: true });
    expect(usuariosService.buscarPorEmail).toHaveBeenCalledWith(
      "docente@unipaz.edu.co",
    );
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "x",
      audience: "cliente-test.apps.googleusercontent.com",
    });
    expect(emitir).toHaveBeenCalled();
  });
});
