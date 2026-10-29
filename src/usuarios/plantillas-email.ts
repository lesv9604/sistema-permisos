import { EmailAEnviar } from '../notificaciones/email.service';

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Correo de bienvenida con credenciales temporales y enlace al sistema. */
export function emailBienvenida(datos: {
  para: string;
  nombre: string;
  passwordTemporal: string;
  urlApp: string;
}): EmailAEnviar {
  const url = `${datos.urlApp.replace(/\/+$/, '')}/login`;
  const texto = [
    `Hola ${datos.nombre},`,
    '',
    'Se creó tu cuenta en el Sistema de Permisos de Talento Humano.',
    '',
    `Usuario: ${datos.para}`,
    `Contraseña temporal: ${datos.passwordTemporal}`,
    '',
    `Ingresa en: ${url}`,
    '',
    'Por seguridad, el sistema te pedirá cambiar la contraseña en tu primer ingreso.',
    'Si no esperabas este correo, comunícate con Talento Humano.',
  ].join('\n');

  const html = `
<p>Hola ${escapar(datos.nombre)},</p>
<p>Se creó tu cuenta en el <strong>Sistema de Permisos de Talento Humano</strong>.</p>
<p>
  <strong>Usuario:</strong> ${escapar(datos.para)}<br>
  <strong>Contraseña temporal:</strong> <code style="font-size:16px">${escapar(datos.passwordTemporal)}</code>
</p>
<p><a href="${escapar(url)}" style="display:inline-block;padding:10px 16px;background:#1d4ed8;color:#fff;border-radius:6px;text-decoration:none">Ingresar al sistema</a></p>
<p style="color:#555">Por seguridad, el sistema te pedirá cambiar la contraseña en tu primer ingreso.<br>
Si no esperabas este correo, comunícate con Talento Humano.</p>`;

  return {
    para: datos.para,
    asunto: 'Tu acceso al Sistema de Permisos – Talento Humano',
    texto,
    html,
  };
}
