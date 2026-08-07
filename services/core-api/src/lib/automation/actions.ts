/**
 * The action registry (§31).
 *
 * `AutomationAction` is a discriminated union, and `ACTION_HANDLERS` is a
 * mapped type over its `type` field — so adding an action to the contract
 * without adding a handler here is a compile error, not a run-time surprise
 * in someone's automation at 3am.
 */
import type { Actor, AutomationAction, AutomationActionType } from '@platform/schemas'
import { withTenant } from '../../db/client.js'
import { findContactById, updateContact } from '../../db/repositories/crm.js'
import { findDealById, findStageByKey, moveDealToStage } from '../../db/repositories/crm-deals.js'
import { insertTask } from '../../db/repositories/crm-activity.js'
import { findEmailTemplateByKey } from '../../db/repositories/email.js'
import { contactVariables, renderEmail } from '../email/render.js'
import { idempotencyKey, sendEmail } from '../email/send.js'

export interface ActionContext {
  tenantId: string
  runId: string
  nodeId: string
  actor: Actor
  /** The run context: whatever the trigger carried, plus earlier node output. */
  context: Record<string, unknown>
}

/** Whatever an action wants recorded on its node run. Kept small and factual. */
export type ActionOutput = Record<string, unknown>

type HandlerFor<T extends AutomationActionType> = (
  action: Extract<AutomationAction, { type: T }>,
  context: ActionContext,
) => Promise<ActionOutput>

type ActionHandlers = { [K in AutomationActionType]: HandlerFor<K> }

function contextString(context: Record<string, unknown>, key: string): string | null {
  const value = context[key]
  return typeof value === 'string' && value ? value : null
}

/**
 * Refuse a webhook target that points back inside the network.
 *
 * A tenant-configured URL is an outbound request the platform makes on their
 * behalf; without this it is also a way to ask the platform to fetch its own
 * metadata service.
 */
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '169.254.169.254', 'metadata.google.internal'])

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (BLOCKED_HOSTS.has(host)) return true
  if (host.endsWith('.internal') || host.endsWith('.local')) return true
  // RFC1918 and carrier-grade NAT ranges, by literal.
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(host)
}

export const ACTION_HANDLERS: ActionHandlers = {
  'email.send': async (action, ctx) => {
    const contactId = contextString(ctx.context, 'contactId')

    const prepared = await withTenant(ctx.tenantId, async (tx) => {
      const contact = contactId ? await findContactById(tx, ctx.tenantId, contactId) : null
      const template = action.templateKey
        ? await findEmailTemplateByKey(tx, ctx.tenantId, action.templateKey)
        : null
      return { contact, template }
    })

    const to =
      action.to === 'address' ? (action.address ?? '') : (prepared.contact?.email ?? action.address ?? '')
    if (!to) return { skipped: true, reason: 'no recipient' }

    const rendered = renderEmail(
      {
        subject: action.subject ?? prepared.template?.subject ?? '',
        bodyHtml: action.bodyHtml ?? prepared.template?.bodyHtml ?? '',
        bodyText: action.bodyText ?? prepared.template?.bodyText ?? '',
      },
      { ...contactVariables(prepared.contact ?? {}), ...(ctx.context as Record<string, string>) },
    )
    if (!rendered.subject) return { skipped: true, reason: 'no subject' }

    // Keyed by run and node, so a resumed run cannot send this step twice even
    // if the node-run row never made it to disk.
    const outcome = await sendEmail(ctx.tenantId, {
      kind: 'automation',
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: idempotencyKey('automation', ctx.runId, ctx.nodeId),
      contactId: prepared.contact?.id ?? null,
    })

    return { status: outcome.status, provider: outcome.provider, messageId: outcome.messageId }
  },

  'crm.update_contact': async (action, ctx) => {
    const contactId = contextString(ctx.context, 'contactId')
    if (!contactId) return { skipped: true, reason: 'no contact in context' }

    const updated = await withTenant(ctx.tenantId, async (tx) => {
      const contact = await findContactById(tx, ctx.tenantId, contactId)
      if (!contact) return null

      const remove = new Set(action.removeTags.map((tag) => tag.toLowerCase()))
      const tags = [
        ...contact.tags.filter((tag) => !remove.has(tag.toLowerCase())),
        ...action.addTags.filter(
          (tag) => !contact.tags.some((existing) => existing.toLowerCase() === tag.toLowerCase()),
        ),
      ].slice(0, 30)

      return updateContact(tx, ctx.tenantId, contactId, { tags, source: action.setSource })
    })

    return updated ? { contactId, tags: updated.tags } : { skipped: true, reason: 'contact not found' }
  },

  'crm.create_task': async (action, ctx) => {
    const contactId = contextString(ctx.context, 'contactId')
    const dealId = contextString(ctx.context, 'dealId')

    const task = await withTenant(ctx.tenantId, (tx) =>
      insertTask(tx, ctx.tenantId, {
        title: action.title,
        description: action.description ?? '',
        priority: action.priority,
        contactId,
        dealId,
        dueAt: new Date(Date.now() + action.dueInSeconds * 1000),
      }),
    )

    return { taskId: task.id }
  },

  'crm.move_deal_stage': async (action, ctx) => {
    const dealId = contextString(ctx.context, 'dealId')
    if (!dealId) return { skipped: true, reason: 'no deal in context' }

    const moved = await withTenant(ctx.tenantId, async (tx) => {
      const deal = await findDealById(tx, ctx.tenantId, dealId)
      if (!deal) return null

      const stage = await findStageByKey(tx, ctx.tenantId, deal.pipelineId, action.stageKey)
      if (!stage) return null

      return moveDealToStage(tx, ctx.tenantId, dealId, stage, {
        reason: 'automation',
        createdBy: ctx.actor.label ?? 'automation',
      })
    })

    return moved ? { dealId, stageKey: action.stageKey } : { skipped: true, reason: 'deal or stage not found' }
  },

  'webhook.post': async (action, ctx) => {
    const url = new URL(action.url)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { skipped: true, reason: 'unsupported scheme' }
    }
    if (isBlockedHost(url.hostname)) return { skipped: true, reason: 'blocked host' }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...action.headers },
        body: JSON.stringify({ runId: ctx.runId, nodeId: ctx.nodeId, context: ctx.context }),
        signal: controller.signal,
        redirect: 'error',
      })
      return { status: response.status, ok: response.ok }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : 'request failed' }
    } finally {
      clearTimeout(timer)
    }
  },
}

/** Dispatch one action. The cast is the union narrowing TypeScript cannot do here. */
export async function dispatchAction(action: AutomationAction, context: ActionContext): Promise<ActionOutput> {
  const handler = ACTION_HANDLERS[action.type] as HandlerFor<AutomationActionType>
  return handler(action as Extract<AutomationAction, { type: AutomationActionType }>, context)
}
