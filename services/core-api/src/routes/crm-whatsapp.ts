import { createHmac, timingSafeEqual } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  createWhatsappAgentInputSchema,
  sendWhatsappReplyInputSchema,
  updateWhatsappAgentInputSchema,
  updateWhatsappConnectionInputSchema,
  updateWhatsappTicketInputSchema,
  whatsappSettingsSchema,
  whatsappTicketStatusSchema,
  uuidSchema,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import {
  deleteSecret,
  findSettingsDocument,
  putSecret,
  upsertSettingsDocument,
} from '../db/repositories/settings.js'
import {
  deleteWhatsappAgent,
  findDefaultWhatsappAgent,
  findWhatsappAgent,
  findWhatsappTicket,
  insertWhatsappAgent,
  insertWhatsappMessage,
  listWhatsappAgents,
  listWhatsappMessages,
  listWhatsappTickets,
  markWhatsappTicketRead,
  updateWhatsappAgent,
  updateWhatsappTicket,
  upsertInboundTicket,
} from '../db/repositories/whatsapp.js'
import { BadRequestError, NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { whatsappWebhookUrl } from '../lib/public-url.js'
import { draftWhatsappAgentReply } from '../lib/whatsapp/agent-reply.js'
import { resolveTenantWhatsappConnection } from '../lib/whatsapp/resolve-provider.js'
import { OpenWaWhatsappProvider } from '../adapters/whatsapp/openwa.js'
import { requireTenant } from '../plugins/auth.js'

function verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string | null): boolean {
  if (!secret) return true
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const provided = signature.replace(/^sha256=/i, '')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  } catch {
    return false
  }
}

/**
 * WhatsApp support desk + AI agents.
 *
 * Mounted under `/api/v1/crm`. OpenWA is only reached through the adapter.
 */
const crmWhatsappRoutes: FastifyPluginAsync = async (app) => {
  app.get('/whatsapp/status', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const resolved = await resolveTenantWhatsappConnection(context.tenantId)
    const configured = resolved.provider.isConfigured()
    const reachable = configured ? await resolved.provider.health() : false
    const sessions = configured && reachable ? await resolved.provider.listSessions().catch(() => []) : []

    return reply.send(
      ok({
        configured,
        reachable,
        reason: resolved.provider.configurationProblem(),
        baseUrl: resolved.baseUrl,
        dashboardUrl: resolved.dashboardUrl,
        source: resolved.source,
        apiKeyConfigured: resolved.apiKeyConfigured,
        webhookSecretConfigured: resolved.webhookSecretConfigured,
        onboardingComplete: resolved.settings.onboardingComplete,
        webhookUrl: whatsappWebhookUrl(context.tenantId, request),
        sessions,
      }),
    )
  })

  app.put('/whatsapp/connection', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const input = parseOrThrow(updateWhatsappConnectionInputSchema, request.body ?? {}, 'body')

    await withTenant(context.tenantId, async (tx) => {
      const stored = await findSettingsDocument(tx, context.tenantId, 'platform', 'whatsapp')
      const current = whatsappSettingsSchema.parse(stored?.value ?? {})
      const next = whatsappSettingsSchema.parse({
        ...current,
        ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
        ...(input.dashboardUrl !== undefined ? { dashboardUrl: input.dashboardUrl } : {}),
        ...(input.onboardingComplete !== undefined
          ? { onboardingComplete: input.onboardingComplete }
          : {}),
      })

      await upsertSettingsDocument(tx, {
        tenantId: context.tenantId,
        scope: 'platform',
        key: 'whatsapp',
        value: next,
        updatedBy: context.user.email,
      })

      if (input.apiKey) {
        await putSecret(tx, {
          tenantId: context.tenantId,
          scope: 'platform',
          key: 'whatsapp',
          field: 'apiKey',
          value: input.apiKey,
          updatedBy: context.user.email,
        })
      }

      if (input.webhookSecret !== undefined) {
        const trimmed = input.webhookSecret.trim()
        if (!trimmed) {
          await deleteSecret(tx, context.tenantId, 'platform', 'whatsapp', 'webhookSecret')
        } else {
          await putSecret(tx, {
            tenantId: context.tenantId,
            scope: 'platform',
            key: 'whatsapp',
            field: 'webhookSecret',
            value: trimmed,
            updatedBy: context.user.email,
          })
        }
      }
    })

    const resolved = await resolveTenantWhatsappConnection(context.tenantId)
    const configured = resolved.provider.isConfigured()
    const reachable = configured ? await resolved.provider.health() : false
    const sessions = configured && reachable ? await resolved.provider.listSessions().catch(() => []) : []

    return reply.send(
      ok({
        configured,
        reachable,
        reason: resolved.provider.configurationProblem(),
        baseUrl: resolved.baseUrl,
        dashboardUrl: resolved.dashboardUrl,
        source: resolved.source,
        apiKeyConfigured: resolved.apiKeyConfigured,
        webhookSecretConfigured: resolved.webhookSecretConfigured,
        onboardingComplete: resolved.settings.onboardingComplete,
        webhookUrl: whatsappWebhookUrl(context.tenantId, request),
        sessions,
      }),
    )
  })

  app.post('/whatsapp/sessions', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const body = parseOrThrow(
      z.object({ name: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9-]+$/) }),
      request.body ?? {},
      'body',
    )
    const resolved = await resolveTenantWhatsappConnection(context.tenantId)
    if (!(resolved.provider instanceof OpenWaWhatsappProvider) || !resolved.provider.isConfigured()) {
      throw new BadRequestError('Connect OpenWA first (base URL + API key).')
    }
    const session = await resolved.provider.createSession(body.name)
    await resolved.provider.startSession(session.id).catch(() => null)
    return reply.code(201).send(ok(session))
  })

  app.post('/whatsapp/sessions/:sessionId/start', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { sessionId } = parseOrThrow(z.object({ sessionId: z.string().min(1).max(128) }), request.params, 'params')
    const resolved = await resolveTenantWhatsappConnection(context.tenantId)
    if (!(resolved.provider instanceof OpenWaWhatsappProvider) || !resolved.provider.isConfigured()) {
      throw new BadRequestError('Connect OpenWA first (base URL + API key).')
    }
    const session = await resolved.provider.startSession(sessionId)
    return reply.send(ok(session))
  })

  app.get('/whatsapp/sessions/:sessionId/qr', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const { sessionId } = parseOrThrow(z.object({ sessionId: z.string().min(1).max(128) }), request.params, 'params')
    const resolved = await resolveTenantWhatsappConnection(context.tenantId)
    if (!(resolved.provider instanceof OpenWaWhatsappProvider) || !resolved.provider.isConfigured()) {
      throw new BadRequestError('Connect OpenWA first (base URL + API key).')
    }
    try {
      const qr = await resolved.provider.getQr(sessionId)
      return reply.send(ok(qr))
    } catch (error) {
      throw new BadRequestError(error instanceof Error ? error.message : 'QR not ready yet. Wait a few seconds and retry.')
    }
  })

  app.get('/whatsapp/agents', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const agents = await withTenant(context.tenantId, (tx) => listWhatsappAgents(tx, context.tenantId))
    return reply.send(ok(agents))
  })

  app.post('/whatsapp/agents', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const input = parseOrThrow(createWhatsappAgentInputSchema, request.body ?? {}, 'body')
    const agent = await withTenant(context.tenantId, (tx) => insertWhatsappAgent(tx, context.tenantId, input))
    return reply.code(201).send(ok(agent))
  })

  app.patch('/whatsapp/agents/:agentId', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { agentId } = parseOrThrow(z.object({ agentId: uuidSchema }), request.params, 'params')
    const input = parseOrThrow(updateWhatsappAgentInputSchema, request.body ?? {}, 'body')
    const agent = await withTenant(context.tenantId, (tx) =>
      updateWhatsappAgent(tx, context.tenantId, agentId, input),
    )
    if (!agent) throw new NotFoundError('WhatsApp agent')
    return reply.send(ok(agent))
  })

  app.delete('/whatsapp/agents/:agentId', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { agentId } = parseOrThrow(z.object({ agentId: uuidSchema }), request.params, 'params')
    const removed = await withTenant(context.tenantId, (tx) =>
      deleteWhatsappAgent(tx, context.tenantId, agentId),
    )
    if (!removed) throw new NotFoundError('WhatsApp agent')
    return reply.send(ok({ deleted: true }))
  })

  app.get('/whatsapp/tickets', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const query = parseOrThrow(
      z.object({
        status: whatsappTicketStatusSchema.optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
      }),
      request.query ?? {},
      'query',
    )
    const tickets = await withTenant(context.tenantId, (tx) =>
      listWhatsappTickets(tx, context.tenantId, query),
    )
    return reply.send(ok(tickets))
  })

  app.get('/whatsapp/tickets/:ticketId', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const { ticketId } = parseOrThrow(z.object({ ticketId: uuidSchema }), request.params, 'params')
    const data = await withTenant(context.tenantId, async (tx) => {
      const ticket = await findWhatsappTicket(tx, context.tenantId, ticketId)
      if (!ticket) return null
      await markWhatsappTicketRead(tx, context.tenantId, ticketId)
      const messages = await listWhatsappMessages(tx, context.tenantId, ticketId)
      return { ticket: { ...ticket, unreadCount: 0 }, messages }
    })
    if (!data) throw new NotFoundError('Ticket')
    return reply.send(ok(data))
  })

  app.patch('/whatsapp/tickets/:ticketId', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { ticketId } = parseOrThrow(z.object({ ticketId: uuidSchema }), request.params, 'params')
    const input = parseOrThrow(updateWhatsappTicketInputSchema, request.body ?? {}, 'body')
    const ticket = await withTenant(context.tenantId, (tx) =>
      updateWhatsappTicket(tx, context.tenantId, ticketId, input),
    )
    if (!ticket) throw new NotFoundError('Ticket')
    return reply.send(ok(ticket))
  })

  app.post('/whatsapp/tickets/:ticketId/reply', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { ticketId } = parseOrThrow(z.object({ ticketId: uuidSchema }), request.params, 'params')
    const { body } = parseOrThrow(sendWhatsappReplyInputSchema, request.body ?? {}, 'body')

    const resolved = await resolveTenantWhatsappConnection(context.tenantId)
    if (!resolved.provider.isConfigured()) {
      throw new BadRequestError(resolved.provider.configurationProblem() ?? 'WhatsApp is not configured.')
    }

    const result = await withTenant(context.tenantId, async (tx) => {
      const ticket = await findWhatsappTicket(tx, context.tenantId, ticketId)
      if (!ticket) return null

      const agent = ticket.agentId
        ? await findWhatsappAgent(tx, context.tenantId, ticket.agentId)
        : await findDefaultWhatsappAgent(tx, context.tenantId)

      const sessionId = agent?.openwaSessionId
      if (!sessionId) {
        throw new BadRequestError('Link an OpenWA session on a WhatsApp agent before sending.')
      }

      const sent = await resolved.provider.sendText({
        sessionId,
        chatId: ticket.chatId,
        text: body,
      })

      const message = await insertWhatsappMessage(tx, {
        tenantId: context.tenantId,
        ticketId,
        direction: 'outbound',
        author: 'agent',
        body,
        externalId: sent.externalId,
      })

      await updateWhatsappTicket(tx, context.tenantId, ticketId, { status: 'pending' })
      return message
    })

    if (!result) throw new NotFoundError('Ticket')
    return reply.code(201).send(ok(result))
  })

  /**
   * Inbound webhook from OpenWA. Tenant is resolved from `?tenantId=` on the
   * webhook URL you register in OpenWA (one URL per tenant).
   */
  app.post('/whatsapp/webhook', async (request, reply) => {
    const query = parseOrThrow(
      z.object({ tenantId: uuidSchema }),
      request.query ?? {},
      'query',
    )

    const raw =
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body ?? {})
    const signature =
      (request.headers['x-openwa-signature'] as string | undefined) ??
      (request.headers['x-webhook-signature'] as string | undefined)

    const resolved = await resolveTenantWhatsappConnection(query.tenantId)
    if (!verifyWebhookSignature(raw, signature, resolved.webhookSecret)) {
      throw new BadRequestError('Invalid webhook signature.')
    }

    const payload = (
      typeof request.body === 'object' && request.body
        ? request.body
        : JSON.parse(raw)
    ) as Record<string, unknown>

    const event = String(payload.event ?? payload.type ?? '')
    if (event && !event.includes('message')) {
      return reply.send(ok({ ignored: true }))
    }

    const data = (payload.data ?? payload.payload ?? payload) as Record<string, unknown>
    const fromMe = Boolean(data.fromMe ?? data.from_me)
    if (fromMe) return reply.send(ok({ ignored: true }))

    const chatId = String(data.chatId ?? data.from ?? data.sender ?? '')
    const body = String(data.body ?? data.text ?? data.message ?? '').trim()
    if (!chatId || !body) return reply.send(ok({ ignored: true }))

    const contactName = String(data.notifyName ?? data.pushName ?? data.senderName ?? '')
    const contactPhone = chatId.replace(/@.*$/, '')

    await withTenant(query.tenantId, async (tx) => {
      const agent = await findDefaultWhatsappAgent(tx, query.tenantId)
      const ticket = await upsertInboundTicket(tx, {
        tenantId: query.tenantId,
        chatId,
        contactPhone,
        contactName,
        agentId: agent?.id ?? null,
        subject: body.slice(0, 80),
      })

      await insertWhatsappMessage(tx, {
        tenantId: query.tenantId,
        ticketId: ticket.id,
        direction: 'inbound',
        author: 'customer',
        body,
        externalId: data.id ? String(data.id) : null,
      })

      if (!agent?.enabled || !agent.autoReply || !agent.openwaSessionId) return
      if (!resolved.provider.isConfigured()) return

      const draft = await draftWhatsappAgentReply(
        {
          systemPrompt: agent.systemPrompt,
          customerMessage: body,
          contactName,
        },
        agent.handoffKeywords,
      )

      const sent = await resolved.provider.sendText({
        sessionId: agent.openwaSessionId,
        chatId,
        text: draft.text,
      })

      await insertWhatsappMessage(tx, {
        tenantId: query.tenantId,
        ticketId: ticket.id,
        direction: 'outbound',
        author: draft.handoff ? 'system' : 'ai',
        body: draft.text,
        externalId: sent.externalId,
      })

      if (draft.handoff) {
        await updateWhatsappTicket(tx, query.tenantId, ticket.id, { status: 'pending' })
      }
    })

    return reply.send(ok({ received: true }))
  })
}

export default crmWhatsappRoutes
