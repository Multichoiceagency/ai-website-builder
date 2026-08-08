import type { Tx } from '../client.js'
import type {
  CreateWhatsappAgentInput,
  UpdateWhatsappAgentInput,
  UpdateWhatsappTicketInput,
  WhatsappAgent,
  WhatsappMessage,
  WhatsappMessageAuthor,
  WhatsappMessageDirection,
  WhatsappTicket,
  WhatsappTicketStatus,
} from '@platform/schemas'

interface AgentRow {
  id: string
  tenant_id: string
  name: string
  description: string
  system_prompt: string
  welcome_message: string
  enabled: boolean
  auto_reply: boolean
  handoff_keywords: string[] | null
  openwa_session_id: string | null
  created_at: Date
  updated_at: Date
}

function toAgent(row: AgentRow): WhatsappAgent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    systemPrompt: row.system_prompt,
    welcomeMessage: row.welcome_message,
    enabled: row.enabled,
    autoReply: row.auto_reply,
    handoffKeywords: row.handoff_keywords ?? [],
    openwaSessionId: row.openwa_session_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listWhatsappAgents(tx: Tx, tenantId: string): Promise<WhatsappAgent[]> {
  const rows = await tx<AgentRow[]>`
    SELECT * FROM whatsapp_agents WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
  `
  return rows.map(toAgent)
}

export async function findWhatsappAgent(tx: Tx, tenantId: string, id: string): Promise<WhatsappAgent | null> {
  const [row] = await tx<AgentRow[]>`
    SELECT * FROM whatsapp_agents WHERE tenant_id = ${tenantId} AND id = ${id} LIMIT 1
  `
  return row ? toAgent(row) : null
}

export async function findDefaultWhatsappAgent(tx: Tx, tenantId: string): Promise<WhatsappAgent | null> {
  const [row] = await tx<AgentRow[]>`
    SELECT * FROM whatsapp_agents
    WHERE tenant_id = ${tenantId} AND enabled = true
    ORDER BY created_at ASC
    LIMIT 1
  `
  return row ? toAgent(row) : null
}

export async function insertWhatsappAgent(
  tx: Tx,
  tenantId: string,
  input: CreateWhatsappAgentInput,
): Promise<WhatsappAgent> {
  const [row] = await tx<AgentRow[]>`
    INSERT INTO whatsapp_agents (
      tenant_id, name, description, system_prompt, welcome_message,
      enabled, auto_reply, handoff_keywords, openwa_session_id
    ) VALUES (
      ${tenantId}, ${input.name}, ${input.description ?? ''}, ${input.systemPrompt},
      ${input.welcomeMessage ?? ''}, ${input.enabled ?? true}, ${input.autoReply ?? true},
      ${input.handoffKeywords ?? []}, ${input.openwaSessionId ?? null}
    )
    RETURNING *
  `
  return toAgent(row!)
}

export async function updateWhatsappAgent(
  tx: Tx,
  tenantId: string,
  id: string,
  input: UpdateWhatsappAgentInput,
): Promise<WhatsappAgent | null> {
  const current = await findWhatsappAgent(tx, tenantId, id)
  if (!current) return null

  const [row] = await tx<AgentRow[]>`
    UPDATE whatsapp_agents SET
      name = ${input.name ?? current.name},
      description = ${input.description ?? current.description},
      system_prompt = ${input.systemPrompt ?? current.systemPrompt},
      welcome_message = ${input.welcomeMessage ?? current.welcomeMessage},
      enabled = ${input.enabled ?? current.enabled},
      auto_reply = ${input.autoReply ?? current.autoReply},
      handoff_keywords = ${input.handoffKeywords ?? current.handoffKeywords},
      openwa_session_id = ${
        input.openwaSessionId === undefined ? current.openwaSessionId : input.openwaSessionId
      }
    WHERE tenant_id = ${tenantId} AND id = ${id}
    RETURNING *
  `
  return row ? toAgent(row) : null
}

export async function deleteWhatsappAgent(tx: Tx, tenantId: string, id: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM whatsapp_agents WHERE tenant_id = ${tenantId} AND id = ${id} RETURNING id
  `
  return rows.length > 0
}

interface TicketRow {
  id: string
  tenant_id: string
  agent_id: string | null
  status: WhatsappTicketStatus
  contact_phone: string
  contact_name: string
  chat_id: string
  subject: string
  assigned_to: string | null
  last_message_at: Date | null
  unread_count: number
  created_at: Date
  updated_at: Date
}

function toTicket(row: TicketRow): WhatsappTicket {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    agentId: row.agent_id,
    status: row.status,
    contactPhone: row.contact_phone,
    contactName: row.contact_name,
    chatId: row.chat_id,
    subject: row.subject,
    assignedTo: row.assigned_to,
    lastMessageAt: row.last_message_at?.toISOString() ?? null,
    unreadCount: row.unread_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listWhatsappTickets(
  tx: Tx,
  tenantId: string,
  query: { status?: WhatsappTicketStatus; limit?: number } = {},
): Promise<WhatsappTicket[]> {
  const limit = query.limit ?? 50
  const rows = query.status
    ? await tx<TicketRow[]>`
        SELECT * FROM whatsapp_tickets
        WHERE tenant_id = ${tenantId} AND status = ${query.status}
        ORDER BY COALESCE(last_message_at, created_at) DESC
        LIMIT ${limit}
      `
    : await tx<TicketRow[]>`
        SELECT * FROM whatsapp_tickets
        WHERE tenant_id = ${tenantId}
        ORDER BY COALESCE(last_message_at, created_at) DESC
        LIMIT ${limit}
      `
  return rows.map(toTicket)
}

export async function findWhatsappTicket(tx: Tx, tenantId: string, id: string): Promise<WhatsappTicket | null> {
  const [row] = await tx<TicketRow[]>`
    SELECT * FROM whatsapp_tickets WHERE tenant_id = ${tenantId} AND id = ${id} LIMIT 1
  `
  return row ? toTicket(row) : null
}

export async function findWhatsappTicketByChat(
  tx: Tx,
  tenantId: string,
  chatId: string,
): Promise<WhatsappTicket | null> {
  const [row] = await tx<TicketRow[]>`
    SELECT * FROM whatsapp_tickets WHERE tenant_id = ${tenantId} AND chat_id = ${chatId} LIMIT 1
  `
  return row ? toTicket(row) : null
}

export async function upsertInboundTicket(
  tx: Tx,
  input: {
    tenantId: string
    chatId: string
    contactPhone: string
    contactName: string
    agentId: string | null
    subject: string
  },
): Promise<WhatsappTicket> {
  const existing = await findWhatsappTicketByChat(tx, input.tenantId, input.chatId)
  if (existing) {
    const [row] = await tx<TicketRow[]>`
      UPDATE whatsapp_tickets SET
        contact_name = CASE WHEN ${input.contactName} = '' THEN contact_name ELSE ${input.contactName} END,
        status = CASE WHEN status IN ('resolved', 'closed') THEN 'open' ELSE status END,
        unread_count = unread_count + 1,
        last_message_at = now(),
        agent_id = COALESCE(agent_id, ${input.agentId})
      WHERE id = ${existing.id}
      RETURNING *
    `
    return toTicket(row!)
  }

  const [row] = await tx<TicketRow[]>`
    INSERT INTO whatsapp_tickets (
      tenant_id, agent_id, contact_phone, contact_name, chat_id, subject,
      unread_count, last_message_at, status
    ) VALUES (
      ${input.tenantId}, ${input.agentId}, ${input.contactPhone}, ${input.contactName},
      ${input.chatId}, ${input.subject}, 1, now(), 'open'
    )
    RETURNING *
  `
  return toTicket(row!)
}

export async function updateWhatsappTicket(
  tx: Tx,
  tenantId: string,
  id: string,
  input: UpdateWhatsappTicketInput,
): Promise<WhatsappTicket | null> {
  const current = await findWhatsappTicket(tx, tenantId, id)
  if (!current) return null

  const clearUnread = input.status === 'resolved' || input.status === 'closed'
  const [row] = await tx<TicketRow[]>`
    UPDATE whatsapp_tickets SET
      status = ${input.status ?? current.status},
      assigned_to = ${input.assignedTo === undefined ? current.assignedTo : input.assignedTo},
      agent_id = ${input.agentId === undefined ? current.agentId : input.agentId},
      subject = ${input.subject ?? current.subject},
      unread_count = CASE WHEN ${clearUnread} THEN 0 ELSE unread_count END
    WHERE tenant_id = ${tenantId} AND id = ${id}
    RETURNING *
  `
  return row ? toTicket(row) : null
}

export async function markWhatsappTicketRead(tx: Tx, tenantId: string, id: string): Promise<void> {
  await tx`
    UPDATE whatsapp_tickets SET unread_count = 0
    WHERE tenant_id = ${tenantId} AND id = ${id}
  `
}

interface MessageRow {
  id: string
  tenant_id: string
  ticket_id: string
  direction: WhatsappMessageDirection
  author: WhatsappMessageAuthor
  body: string
  external_id: string | null
  created_at: Date
}

function toMessage(row: MessageRow): WhatsappMessage {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ticketId: row.ticket_id,
    direction: row.direction,
    author: row.author,
    body: row.body,
    externalId: row.external_id,
    createdAt: row.created_at.toISOString(),
  }
}

export async function listWhatsappMessages(
  tx: Tx,
  tenantId: string,
  ticketId: string,
  limit = 200,
): Promise<WhatsappMessage[]> {
  const rows = await tx<MessageRow[]>`
    SELECT * FROM whatsapp_messages
    WHERE tenant_id = ${tenantId} AND ticket_id = ${ticketId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `
  return rows.map(toMessage)
}

export async function insertWhatsappMessage(
  tx: Tx,
  input: {
    tenantId: string
    ticketId: string
    direction: WhatsappMessageDirection
    author: WhatsappMessageAuthor
    body: string
    externalId?: string | null
  },
): Promise<WhatsappMessage> {
  const [row] = await tx<MessageRow[]>`
    INSERT INTO whatsapp_messages (
      tenant_id, ticket_id, direction, author, body, external_id
    ) VALUES (
      ${input.tenantId}, ${input.ticketId}, ${input.direction}, ${input.author},
      ${input.body}, ${input.externalId ?? null}
    )
    RETURNING *
  `

  await tx`
    UPDATE whatsapp_tickets SET last_message_at = now()
    WHERE id = ${input.ticketId} AND tenant_id = ${input.tenantId}
  `

  return toMessage(row!)
}
