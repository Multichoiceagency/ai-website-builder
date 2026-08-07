/**
 * Variable substitution for subjects and bodies.
 *
 * `{{ firstName }}` and nothing more. Not a template language: a mail body is
 * tenant-authored content, and an expression evaluator over tenant-authored
 * content is a code-execution feature nobody asked for.
 */
import { escapeHtml, stripHtml } from './mime.js'

export type TemplateVariables = Record<string, string | number | boolean | null | undefined>

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_.]{1,64})\s*\}\}/g

function lookup(variables: TemplateVariables, name: string): string {
  const value = variables[name]
  if (value === null || value === undefined) return ''
  return String(value)
}

/** Plain-text context: no escaping, because there is no markup to escape into. */
export function renderText(template: string, variables: TemplateVariables): string {
  return template.replace(PLACEHOLDER, (_match, name: string) => lookup(variables, name))
}

/**
 * HTML context: every substituted value is escaped. A contact's name is
 * attacker-influenced input the moment a form writes it, and it must not be
 * able to close a tag in the message that goes to someone else.
 */
export function renderHtml(template: string, variables: TemplateVariables): string {
  return template.replace(PLACEHOLDER, (_match, name: string) => escapeHtml(lookup(variables, name)))
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export function renderEmail(
  source: { subject: string; bodyHtml?: string; bodyText?: string },
  variables: TemplateVariables,
): RenderedEmail {
  const html = renderHtml(source.bodyHtml ?? '', variables)
  const text = source.bodyText?.trim()
    ? renderText(source.bodyText, variables)
    : stripHtml(html)

  return {
    subject: renderText(source.subject, variables),
    html,
    text,
  }
}

/** The variables every send gets, so a template can always greet the recipient. */
export function contactVariables(contact: {
  firstName?: string
  lastName?: string
  email?: string
  companyName?: string
}): TemplateVariables {
  return {
    firstName: contact.firstName ?? '',
    lastName: contact.lastName ?? '',
    fullName: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
    email: contact.email ?? '',
    companyName: contact.companyName ?? '',
  }
}
