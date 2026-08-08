/**
 * WhatsApp channel adapter (ADR-0006).
 *
 * OpenWA is the first engine. Meta Cloud API can replace it later without
 * touching the support-desk routes or UI.
 */

export interface WhatsappSessionSummary {
  id: string
  name: string
  status: string
}

export interface WhatsappSendTextInput {
  sessionId: string
  chatId: string
  text: string
}

export interface WhatsappProvider {
  readonly id: string
  isConfigured(): boolean
  configurationProblem(): string | null
  health(): Promise<boolean>
  listSessions(): Promise<WhatsappSessionSummary[]>
  sendText(input: WhatsappSendTextInput): Promise<{ externalId: string | null }>
}

export class WhatsappUnconfiguredError extends Error {
  constructor(message = 'WhatsApp gateway is not configured.') {
    super(message)
    this.name = 'WhatsappUnconfiguredError'
  }
}
