/**
 * The five flows from §30, as stored definitions.
 *
 * They ship disabled and empty of brand voice on purpose: a flow that starts
 * mailing customers the moment a workspace is created is not a feature. A
 * tenant installs them, edits the copy, then enables them.
 */
import type { CreateEmailFlowInput } from '@platform/schemas'

export const DEFAULT_EMAIL_FLOWS: CreateEmailFlowInput[] = [
  {
    key: 'abandoned_cart',
    kind: 'abandoned_cart',
    name: 'Abandoned cart',
    description:
      'Reminds someone who started a checkout and did not finish it. Suppressing it once the order lands needs commerce state from Phase 5.',
    triggerEvent: 'checkout.started',
    steps: [
      {
        id: 'reminder_1h',
        delaySeconds: 3600,
        subject: 'You left something behind',
        bodyHtml: '<p>Hello {{ firstName }},</p><p>Your cart is still waiting for you.</p>',
        bodyText: 'Hello {{ firstName }},\n\nYour cart is still waiting for you.',
      },
      {
        id: 'reminder_24h',
        // Delays chain from the previous step, so 23h after the 1h reminder
        // puts this one a day after the abandoned checkout.
        delaySeconds: 82_800,
        subject: 'Still interested?',
        bodyHtml: '<p>Hello {{ firstName }},</p><p>Can we help you finish your order?</p>',
        bodyText: 'Hello {{ firstName }},\n\nCan we help you finish your order?',
      },
    ],
  },
  {
    key: 'post_purchase',
    kind: 'post_purchase',
    name: 'Post-purchase',
    description: 'Thanks the customer and sets expectations after an order.',
    triggerEvent: 'order.placed',
    steps: [
      {
        id: 'thank_you',
        delaySeconds: 0,
        subject: 'Thank you for your order',
        bodyHtml: '<p>Hello {{ firstName }},</p><p>Thank you — we are preparing your order.</p>',
        bodyText: 'Hello {{ firstName }},\n\nThank you — we are preparing your order.',
      },
    ],
  },
  {
    key: 'win_back',
    kind: 'win_back',
    name: 'Win-back',
    description:
      'Reaches out to a customer who has not ordered in a while. It has no trigger event yet — "has not ordered in 90 days" is a scheduled query, not something that happens, so this one cannot be enabled until there is a scheduler to ask the question.',
    triggerEvent: '',
    steps: [
      {
        id: 'win_back_90d',
        delaySeconds: 0,
        subject: 'We have missed you',
        bodyHtml: '<p>Hello {{ firstName }},</p><p>It has been a while. Here is what is new.</p>',
        bodyText: 'Hello {{ firstName }},\n\nIt has been a while. Here is what is new.',
      },
    ],
  },
  {
    key: 'review_request',
    kind: 'review_request',
    name: 'Review request',
    description: 'Asks for a review once the customer has had the product for a while.',
    triggerEvent: 'order.placed',
    steps: [
      {
        id: 'ask_7d',
        delaySeconds: 604_800,
        subject: 'How did we do?',
        bodyHtml: '<p>Hello {{ firstName }},</p><p>Would you tell us how it went?</p>',
        bodyText: 'Hello {{ firstName }},\n\nWould you tell us how it went?',
      },
    ],
  },
  {
    key: 'lead_nurture',
    kind: 'lead_nurture',
    name: 'Lead nurture',
    description: 'Follows up on a new enquiry until someone picks it up.',
    triggerEvent: 'lead.created',
    steps: [
      {
        id: 'acknowledge',
        delaySeconds: 0,
        subject: 'Thank you for getting in touch',
        bodyHtml: '<p>Hello {{ firstName }},</p><p>We have your message and will reply shortly.</p>',
        bodyText: 'Hello {{ firstName }},\n\nWe have your message and will reply shortly.',
      },
      {
        id: 'follow_up_3d',
        delaySeconds: 259_200,
        subject: 'Anything else we can help with?',
        bodyHtml: '<p>Hello {{ firstName }},</p><p>Just checking in on your enquiry.</p>',
        bodyText: 'Hello {{ firstName }},\n\nJust checking in on your enquiry.',
      },
    ],
  },
]
