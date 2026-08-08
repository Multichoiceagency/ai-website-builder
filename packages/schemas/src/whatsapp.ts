import { z } from 'zod'
import { isoTimestampSchema, uuidSchema } from './common.js'

/**
 * WhatsApp support desk + AI agents (§29 CRM, messaging channel).
 *
 * OpenWA (and later Cloud API) sit behind the WhatsApp adapter — these shapes
 * are platform-owned and never leak vendor session ids into the UI as the
 * source of truth.
 */

export const whatsappTicketStatusSchema = z.enum([
  'open',
  'pending',
  'resolved',
  'closed',
])
export type WhatsappTicketStatus = z.infer<typeof whatsappTicketStatusSchema>

export const whatsappMessageDirectionSchema = z.enum(['inbound', 'outbound'])
export type WhatsappMessageDirection = z.infer<typeof whatsappMessageDirectionSchema>

export const whatsappMessageAuthorSchema = z.enum(['customer', 'agent', 'ai', 'system'])
export type WhatsappMessageAuthor = z.infer<typeof whatsappMessageAuthorSchema>

export const whatsappAgentSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).default(''),
  systemPrompt: z.string().min(1).max(8000),
  welcomeMessage: z.string().max(1000).default(''),
  enabled: z.boolean(),
  autoReply: z.boolean(),
  handoffKeywords: z.array(z.string().min(1).max(64)).max(20).default([]),
  openwaSessionId: z.string().max(128).nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type WhatsappAgent = z.infer<typeof whatsappAgentSchema>

export const createWhatsappAgentInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(''),
  systemPrompt: z.string().trim().min(1).max(8000),
  welcomeMessage: z.string().trim().max(1000).optional().default(''),
  enabled: z.boolean().optional().default(true),
  autoReply: z.boolean().optional().default(true),
  handoffKeywords: z.array(z.string().trim().min(1).max(64)).max(20).optional().default([]),
  openwaSessionId: z.string().trim().max(128).nullable().optional(),
})
export type CreateWhatsappAgentInput = z.infer<typeof createWhatsappAgentInputSchema>

export const updateWhatsappAgentInputSchema = createWhatsappAgentInputSchema.partial()
export type UpdateWhatsappAgentInput = z.infer<typeof updateWhatsappAgentInputSchema>

export const whatsappTicketSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  agentId: uuidSchema.nullable(),
  status: whatsappTicketStatusSchema,
  contactPhone: z.string().min(1).max(32),
  contactName: z.string().max(160).default(''),
  chatId: z.string().min(1).max(128),
  subject: z.string().max(240).default(''),
  assignedTo: uuidSchema.nullable(),
  lastMessageAt: isoTimestampSchema.nullable(),
  unreadCount: z.number().int().min(0),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type WhatsappTicket = z.infer<typeof whatsappTicketSchema>

export const whatsappMessageSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  ticketId: uuidSchema,
  direction: whatsappMessageDirectionSchema,
  author: whatsappMessageAuthorSchema,
  body: z.string().max(8000),
  externalId: z.string().max(128).nullable(),
  createdAt: isoTimestampSchema,
})
export type WhatsappMessage = z.infer<typeof whatsappMessageSchema>

export const sendWhatsappReplyInputSchema = z.object({
  body: z.string().trim().min(1).max(4000),
})
export type SendWhatsappReplyInput = z.infer<typeof sendWhatsappReplyInputSchema>

export const updateWhatsappTicketInputSchema = z.object({
  status: whatsappTicketStatusSchema.optional(),
  assignedTo: uuidSchema.nullable().optional(),
  agentId: uuidSchema.nullable().optional(),
  subject: z.string().trim().max(240).optional(),
})
export type UpdateWhatsappTicketInput = z.infer<typeof updateWhatsappTicketInputSchema>

export const whatsappConnectionStatusSchema = z.object({
  configured: z.boolean(),
  reachable: z.boolean(),
  reason: z.string().nullable(),
  baseUrl: z.string().nullable(),
  dashboardUrl: z.string().nullable(),
  /** Where credentials came from for this tenant. */
  source: z.enum(['tenant', 'env']).nullable(),
  apiKeyConfigured: z.boolean(),
  webhookSecretConfigured: z.boolean(),
  onboardingComplete: z.boolean(),
  webhookUrl: z.string().nullable(),
  sessions: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.string(),
      }),
    )
    .default([]),
})
export type WhatsappConnectionStatus = z.infer<typeof whatsappConnectionStatusSchema>

export const updateWhatsappConnectionInputSchema = z.object({
  baseUrl: z.string().trim().max(500).optional(),
  dashboardUrl: z.string().trim().max(500).optional(),
  onboardingComplete: z.boolean().optional(),
  /** When present, replaces the stored API key. Empty string is ignored. */
  apiKey: z.string().trim().min(4).max(4096).optional(),
  /** When present, replaces the stored webhook secret. Empty string clears it. */
  webhookSecret: z.string().trim().max(4096).optional(),
})
export type UpdateWhatsappConnectionInput = z.infer<typeof updateWhatsappConnectionInputSchema>
