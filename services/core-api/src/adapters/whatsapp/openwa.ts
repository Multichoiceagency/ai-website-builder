import {
  WhatsappUnconfiguredError,
  type WhatsappProvider,
  type WhatsappSendTextInput,
  type WhatsappSessionSummary,
} from './types.js'

export interface OpenWaClientConfig {
  baseUrl: string
  apiKey: string
}

export interface OpenWaQrResult {
  qrCode: string
  status: string
}

/**
 * OpenWA HTTP client — the only file that knows OpenWA URLs/headers exist.
 * @see https://github.com/rmyndharis/OpenWA
 */
export class OpenWaWhatsappProvider implements WhatsappProvider {
  readonly id = 'openwa'

  constructor(private readonly config: OpenWaClientConfig | null = null) {}

  isConfigured(): boolean {
    return Boolean(this.config?.baseUrl && this.config?.apiKey)
  }

  configurationProblem(): string | null {
    if (!this.config?.baseUrl) return 'OpenWA base URL is not set.'
    if (!this.config?.apiKey) return 'OpenWA API key is not set.'
    return null
  }

  get baseUrl(): string | null {
    return this.config?.baseUrl ?? null
  }

  async health(): Promise<boolean> {
    if (!this.isConfigured()) return false
    try {
      const response = await this.#fetch('/api/health')
      return response.ok
    } catch {
      return false
    }
  }

  async listSessions(): Promise<WhatsappSessionSummary[]> {
    this.#assertConfigured()
    const response = await this.#fetch('/api/sessions')
    if (!response.ok) {
      throw new Error(`OpenWA list sessions failed (${response.status}).`)
    }
    const payload = (await response.json()) as unknown
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown }).data)
        ? ((payload as { data: unknown[] }).data)
        : []

    return rows
      .map((row) => {
        const entry = row as Record<string, unknown>
        return {
          id: String(entry.id ?? entry.sessionId ?? ''),
          name: String(entry.name ?? entry.id ?? 'session'),
          status: String(entry.status ?? entry.state ?? 'unknown'),
        }
      })
      .filter((row) => row.id)
  }

  async createSession(name: string): Promise<WhatsappSessionSummary> {
    this.#assertConfigured()
    const response = await this.#fetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`OpenWA create session failed (${response.status}): ${detail.slice(0, 200)}`)
    }
    const entry = (await response.json()) as Record<string, unknown>
    return {
      id: String(entry.id ?? ''),
      name: String(entry.name ?? name),
      status: String(entry.status ?? 'created'),
    }
  }

  async startSession(sessionId: string): Promise<WhatsappSessionSummary> {
    this.#assertConfigured()
    const response = await this.#fetch(`/api/sessions/${encodeURIComponent(sessionId)}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`OpenWA start session failed (${response.status}): ${detail.slice(0, 200)}`)
    }
    const entry = (await response.json().catch(() => ({}))) as Record<string, unknown>
    return {
      id: sessionId,
      name: String(entry.name ?? sessionId),
      status: String(entry.status ?? 'starting'),
    }
  }

  async getQr(sessionId: string): Promise<OpenWaQrResult> {
    this.#assertConfigured()
    const response = await this.#fetch(`/api/sessions/${encodeURIComponent(sessionId)}/qr`)
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`OpenWA QR not ready (${response.status}): ${detail.slice(0, 200)}`)
    }
    const entry = (await response.json()) as Record<string, unknown>
    const qrCode = String(entry.qrCode ?? entry.qr ?? '')
    if (!qrCode) throw new Error('OpenWA returned an empty QR payload.')
    return {
      qrCode,
      status: String(entry.status ?? 'qr_ready'),
    }
  }

  async sendText(input: WhatsappSendTextInput): Promise<{ externalId: string | null }> {
    this.#assertConfigured()
    const response = await this.#fetch(`/api/sessions/${encodeURIComponent(input.sessionId)}/messages/send-text`, {
      method: 'POST',
      body: JSON.stringify({ chatId: input.chatId, text: input.text }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`OpenWA send failed (${response.status}): ${detail.slice(0, 200)}`)
    }
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
    const id =
      (payload?.id as string | undefined) ??
      (payload?.messageId as string | undefined) ??
      ((payload?.data as Record<string, unknown> | undefined)?.id as string | undefined) ??
      null
    return { externalId: id }
  }

  #assertConfigured() {
    const problem = this.configurationProblem()
    if (problem) throw new WhatsappUnconfiguredError(problem)
  }

  async #fetch(path: string, init?: RequestInit): Promise<Response> {
    const base = this.config!.baseUrl.replace(/\/+$/, '')
    return fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config!.apiKey,
        ...(init?.headers ?? {}),
      },
    })
  }
}

export function createWhatsappProvider(config: OpenWaClientConfig | null = null): OpenWaWhatsappProvider {
  return new OpenWaWhatsappProvider(config)
}
