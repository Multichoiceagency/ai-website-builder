/**
 * Segment evaluation.
 *
 * A segment is a stored definition (`emailSegmentDefinitionSchema`) that is
 * resolved against contacts at send time. Every rule here is one the matcher
 * genuinely reads — the field enum in `packages/schemas` exists so a rule
 * cannot name something this file ignores.
 */
import type { CrmContact, EmailSegmentDefinition, EmailSegmentRule } from '@platform/schemas'

function matchesRule(contact: CrmContact, rule: EmailSegmentRule): boolean {
  const raw = rule.value

  switch (rule.field) {
    case 'tag': {
      const tag = String(raw ?? '').toLowerCase()
      const has = contact.tags.some((candidate) => candidate.toLowerCase() === tag)
      if (rule.operator === 'neq') return !has
      if (rule.operator === 'exists') return contact.tags.length > 0
      return has
    }

    case 'source': {
      const source = String(raw ?? '')
      if (rule.operator === 'neq') return contact.source !== source
      if (rule.operator === 'contains') return contact.source.includes(source)
      return contact.source === source
    }

    case 'consent.email': {
      const expected = raw === undefined ? true : Boolean(raw)
      if (rule.operator === 'neq') return contact.consent.email !== expected
      return contact.consent.email === expected
    }

    case 'createdAt': {
      const boundary = new Date(String(raw ?? ''))
      if (Number.isNaN(boundary.getTime())) return false
      const created = new Date(contact.createdAt)
      if (rule.operator === 'before') return created < boundary
      if (rule.operator === 'after') return created > boundary
      return created.getTime() === boundary.getTime()
    }

    default:
      return false
  }
}

export function matchesSegment(contact: CrmContact, definition: EmailSegmentDefinition): boolean {
  // Consent is not one rule among others. It is the gate: a marketing send to
  // someone who did not opt in is not a bug in a filter, it is a fine.
  if (definition.requireConsent && !contact.consent.email) return false
  if (!contact.email) return false
  if (definition.rules.length === 0) return true

  return definition.match === 'any'
    ? definition.rules.some((rule) => matchesRule(contact, rule))
    : definition.rules.every((rule) => matchesRule(contact, rule))
}

export function countSegmentMembers(contacts: CrmContact[], definition: EmailSegmentDefinition): number {
  return contacts.reduce((total, contact) => (matchesSegment(contact, definition) ? total + 1 : total), 0)
}
