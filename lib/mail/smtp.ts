import net, { type Socket } from 'node:net';
import tls, { type TLSSocket } from 'node:tls';

type SmtpSocket = Socket | TLSSocket;
type ReaderState = { buffer: string };

function readReply(socket: SmtpSocket, state: ReaderState): Promise<{ code: number; lines: string[] }> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    let expectedCode: string | null = null;

    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const onClose = () => { cleanup(); reject(new Error('SMTP connection closed unexpectedly')); };
    const onData = (chunk: Buffer) => {
      state.buffer += chunk.toString('utf8');
      while (state.buffer.includes('\r\n')) {
        const index = state.buffer.indexOf('\r\n');
        const line = state.buffer.slice(0, index);
        state.buffer = state.buffer.slice(index + 2);
        if (!line) continue;
        lines.push(line);
        const match = /^(\d{3})([- ])/.exec(line);
        if (!match) continue;
        expectedCode ??= match[1];
        if (match[1] === expectedCode && match[2] === ' ') {
          cleanup();
          resolve({ code: Number(match[1]), lines });
          return;
        }
      }
    };

    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('close', onClose);
  });
}

function expect(reply: { code: number; lines: string[] }, allowed: number[]): void {
  if (!allowed.includes(reply.code)) {
    throw new Error('SMTP ' + reply.code + ': ' + reply.lines.join(' | '));
  }
}

async function command(socket: SmtpSocket, state: ReaderState, value: string, allowed: number[]): Promise<void> {
  socket.write(value + '\r\n');
  expect(await readReply(socket, state), allowed);
}

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || 'smtp.protonmail.ch';
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM?.trim() || user;
  if (!host || !Number.isInteger(port) || port <= 0 || !user || !password || !from) {
    throw new Error('SMTP is not configured');
  }
  return { host, port, user, password, from };
}

function connectPlain(host: string, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const onError = (error: Error) => reject(error);
    socket.once('error', onError);
    socket.once('connect', () => {
      socket.off('error', onError);
      socket.setTimeout(15000, () => socket.destroy(new Error('SMTP timeout')));
      resolve(socket);
    });
  });
}

function upgradeTls(socket: Socket, host: string): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const secure = tls.connect({ socket, servername: host, minVersion: 'TLSv1.2' });
    secure.once('secureConnect', () => resolve(secure));
    secure.once('error', reject);
  });
}

function safeAddress(value: string): string {
  const normalized = value.trim();
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(normalized)) {
    throw new Error('Invalid email address');
  }
  return normalized;
}

export async function sendPasswordResetOtp(to: string, code: string): Promise<void> {
  const config = smtpConfig();
  const recipient = safeAddress(to);
  const sender = safeAddress(config.from);
  const plain = await connectPlain(config.host, config.port);
  const plainState: ReaderState = { buffer: '' };

  try {
    expect(await readReply(plain, plainState), [220]);
    await command(plain, plainState, 'EHLO gardenworld.online', [250]);
    await command(plain, plainState, 'STARTTLS', [220]);

    const secure = await upgradeTls(plain, config.host);
    const secureState: ReaderState = { buffer: '' };
    try {
      await command(secure, secureState, 'EHLO gardenworld.online', [250]);
      const auth = Buffer.from('\0' + config.user + '\0' + config.password, 'utf8').toString('base64');
      await command(secure, secureState, 'AUTH PLAIN ' + auth, [235]);
      await command(secure, secureState, 'MAIL FROM:<' + sender + '>', [250]);
      await command(secure, secureState, 'RCPT TO:<' + recipient + '>', [250, 251]);
      await command(secure, secureState, 'DATA', [354]);

      const subject = 'Codigo para restablecer tu contrasena - Garden World';
      const textBody = [
        'Garden World - Administracion',
        '',
        'Tu codigo de verificacion es: ' + code,
        '',
        'El codigo vence en 10 minutos y solo puede utilizarse una vez.',
        'Si no solicitaste este cambio, ignora este mensaje.',
      ].join('\r\n');
      const message = [
        'From: Garden World <' + sender + '>',
        'To: ' + recipient,
        'Subject: ' + subject,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        textBody,
      ].join('\r\n').replace(/^\./gm, '..');

      secure.write(message + '\r\n.\r\n');
      expect(await readReply(secure, secureState), [250]);
      await command(secure, secureState, 'QUIT', [221]);
      secure.end();
    } catch (error) {
      secure.destroy();
      throw error;
    }
  } catch (error) {
    plain.destroy();
    throw error;
  }
}
