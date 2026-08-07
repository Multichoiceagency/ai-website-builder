/**
 * SMTP transport, written directly against `node:net` / `node:tls`.
 *
 * The platform has no mail-vendor dependency, and adding one for a single
 * ESMTP conversation would put a vendor in `package.json` for something the
 * standard library already does. This is the whole of it: greeting, EHLO,
 * STARTTLS, AUTH, envelope, DATA, QUIT.
 *
 * Credentials arrive from `EmailConfig` and never leave this file — not in an
 * error message, not in a log line.
 */
import net from 'node:net'
import tls from 'node:tls'
import type { EmailConfig } from './config.js'
import { buildMimeMessage } from './mime.js'
import { EmailDeliveryError, type EmailProvider, type EmailSendResult, type OutgoingEmail } from './provider.js'

const CRLF = '\r\n'

interface SmtpReply {
  code: number
  lines: string[]
}

/**
 * One SMTP conversation.
 *
 * Replies are line-oriented and can be multi-line (`250-EXT` … `250 EXT`), so
 * reading has to buffer until a line arrives whose fourth character is a
 * space. Anything simpler desynchronises the moment a server advertises more
 * than one extension.
 */
class SmtpConversation {
  #socket: net.Socket | tls.TLSSocket
  #buffer = ''
  #waiter: { resolve: (reply: SmtpReply) => void; reject: (error: Error) => void } | null = null
  #failure: Error | null = null
  readonly #pending: string[] = []

  constructor(socket: net.Socket | tls.TLSSocket, private readonly timeoutMs: number) {
    this.#socket = socket
    this.#attach(socket)
  }

  #attach(socket: net.Socket | tls.TLSSocket): void {
    socket.setEncoding('utf8')
    socket.on('data', (chunk: unknown) => this.#onData(String(chunk)))
    socket.on('error', (error: Error) => this.#fail(error))
    socket.on('close', () => this.#fail(new EmailDeliveryError('SMTP connection closed unexpectedly.')))
  }

  #fail(error: Error): void {
    this.#failure = error
    const waiter = this.#waiter
    this.#waiter = null
    waiter?.reject(error)
  }

  #onData(chunk: string): void {
    this.#buffer += chunk

    let index = this.#buffer.indexOf(CRLF)
    const lines: string[] = []
    while (index !== -1) {
      lines.push(this.#buffer.slice(0, index))
      this.#buffer = this.#buffer.slice(index + 2)
      index = this.#buffer.indexOf(CRLF)
    }
    if (!lines.length) return

    this.#pending.push(...lines)

    // A reply is complete once we have seen a line of the form `NNN <text>`.
    const finalIndex = this.#pending.findIndex((line) => /^\d{3} /.test(line))
    if (finalIndex === -1) return

    const replyLines = this.#pending.splice(0, finalIndex + 1)
    const code = Number(replyLines[replyLines.length - 1]!.slice(0, 3))
    const waiter = this.#waiter
    this.#waiter = null
    waiter?.resolve({ code, lines: replyLines })
  }

  read(): Promise<SmtpReply> {
    if (this.#failure) return Promise.reject(this.#failure)

    return new Promise<SmtpReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#waiter = null
        reject(new EmailDeliveryError('SMTP server did not reply in time.'))
      }, this.timeoutMs)

      this.#waiter = {
        resolve: (reply) => {
          clearTimeout(timer)
          resolve(reply)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      }
    })
  }

  write(line: string): void {
    this.#socket.write(line + CRLF)
  }

  /** Send a command and assert the reply code. The command text is never logged. */
  async command(line: string, expected: number[], label: string): Promise<SmtpReply> {
    this.write(line)
    const reply = await this.read()
    if (!expected.includes(reply.code)) {
      throw new EmailDeliveryError(`SMTP ${label} failed with ${reply.code}.`)
    }
    return reply
  }

  /** Replace the socket after STARTTLS. The conversation continues encrypted. */
  upgrade(socket: tls.TLSSocket): void {
    this.#socket.removeAllListeners('data')
    this.#socket.removeAllListeners('error')
    this.#socket.removeAllListeners('close')
    this.#buffer = ''
    this.#pending.length = 0
    this.#socket = socket
    this.#attach(socket)
  }

  end(): void {
    this.#socket.removeAllListeners('close')
    this.#socket.end()
    this.#socket.destroy()
  }
}

function connectPlain(config: EmailConfig): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: config.host, port: config.port })
    socket.setTimeout(config.timeoutMs)
    socket.once('connect', () => {
      // The connect timeout must not stay armed for the conversation; the
      // per-reply timeout in `SmtpConversation` covers everything after this.
      socket.setTimeout(0)
      resolve(socket)
    })
    socket.once('timeout', () => {
      socket.destroy()
      reject(new EmailDeliveryError('SMTP connection timed out.'))
    })
    socket.once('error', () => reject(new EmailDeliveryError('Could not reach the SMTP server.')))
  })
}

function connectSecure(config: EmailConfig, socket?: net.Socket): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secure = tls.connect({
      host: config.host,
      port: config.port,
      socket,
      servername: config.host,
      // The certificate is checked. An SMTP session that silently accepts any
      // certificate authenticates with a password to whoever answered.
      rejectUnauthorized: true,
    })
    secure.setTimeout(config.timeoutMs)
    secure.once('secureConnect', () => {
      secure.setTimeout(0)
      resolve(secure)
    })
    secure.once('timeout', () => {
      secure.destroy()
      reject(new EmailDeliveryError('SMTP TLS handshake timed out.'))
    })
    secure.once('error', () => reject(new EmailDeliveryError('SMTP TLS handshake failed.')))
  })
}

function supports(reply: SmtpReply, extension: string): boolean {
  return reply.lines.some((line) => line.slice(4).toUpperCase().startsWith(extension))
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp' as const
  readonly configured = true

  constructor(private readonly config: EmailConfig) {}

  async send(message: OutgoingEmail): Promise<EmailSendResult> {
    const config = this.config
    const socket = config.secure ? await connectSecure(config) : await connectPlain(config)
    const conversation = new SmtpConversation(socket, config.timeoutMs)

    try {
      const greeting = await conversation.read()
      if (greeting.code !== 220) throw new EmailDeliveryError(`SMTP server refused the session (${greeting.code}).`)

      const clientName = config.fromAddress.split('@')[1] ?? 'localhost'
      let capabilities = await conversation.command(`EHLO ${clientName}`, [250], 'EHLO')

      if (!config.secure && supports(capabilities, 'STARTTLS')) {
        await conversation.command('STARTTLS', [220], 'STARTTLS')
        const upgraded = await connectSecure(config, socket)
        conversation.upgrade(upgraded)
        // The capability list before and after STARTTLS are different lists;
        // AUTH in particular is usually only advertised once encrypted.
        capabilities = await conversation.command(`EHLO ${clientName}`, [250], 'EHLO')
      }

      await this.#authenticate(conversation, capabilities)

      await conversation.command(`MAIL FROM:<${config.fromAddress}>`, [250], 'MAIL FROM')
      await conversation.command(`RCPT TO:<${message.to}>`, [250, 251], 'RCPT TO')
      await conversation.command('DATA', [354], 'DATA')

      conversation.write(buildMimeMessage(message, clientName))
      const accepted = await conversation.command('.', [250], 'message body')

      // Most servers return their queue id in the 250 line. Keeping it makes a
      // delivery question answerable from the message log alone.
      const providerMessageId = accepted.lines[accepted.lines.length - 1]?.slice(4).trim() ?? ''

      await conversation.command('QUIT', [221], 'QUIT').catch(() => undefined)
      return { provider: this.name, providerMessageId: providerMessageId.slice(0, 200) }
    } finally {
      conversation.end()
    }
  }

  async #authenticate(conversation: SmtpConversation, capabilities: SmtpReply): Promise<void> {
    const advertised = capabilities.lines.find((line) => line.slice(4).toUpperCase().startsWith('AUTH'))
    const mechanisms = (advertised?.slice(4).toUpperCase() ?? '').split(/\s+/)

    if (mechanisms.includes('PLAIN')) {
      const token = Buffer.from(`\0${this.config.user}\0${this.config.password}`, 'utf8').toString('base64')
      await conversation.command(`AUTH PLAIN ${token}`, [235], 'authentication')
      return
    }

    if (mechanisms.includes('LOGIN')) {
      await conversation.command('AUTH LOGIN', [334], 'authentication')
      await conversation.command(Buffer.from(this.config.user, 'utf8').toString('base64'), [334], 'authentication')
      await conversation.command(Buffer.from(this.config.password, 'utf8').toString('base64'), [235], 'authentication')
      return
    }

    throw new EmailDeliveryError('SMTP server offers no supported authentication mechanism.')
  }
}
