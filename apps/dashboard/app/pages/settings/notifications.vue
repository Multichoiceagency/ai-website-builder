<script setup lang="ts">
/**
 * Notifications (§60): which events e-mail whom.
 *
 * A rule is either "these addresses" or "everyone with these roles" — never a
 * silent mix, because a rule you cannot read at a glance is a rule that mails
 * the wrong people for months.
 */
const EVENTS = [
  { key: 'page.published', label: 'A page is published', group: 'Website' },
  { key: 'domain.verified', label: 'A domain is verified', group: 'Website' },
  { key: 'member.invited', label: 'Someone is invited to the workspace', group: 'Workspace' },
  { key: 'plan.limit_reached', label: 'A plan limit is reached', group: 'Workspace' },
  { key: 'order.placed', label: 'An order is placed', group: 'Commerce' },
  { key: 'payment.captured', label: 'A payment is captured', group: 'Commerce' },
  { key: 'refund.created', label: 'A refund is issued', group: 'Commerce' },
  { key: 'lead.created', label: 'A lead comes in', group: 'Growth' },
  { key: 'deal.won', label: 'A deal is won', group: 'Growth' },
  { key: 'experiment.completed', label: 'An experiment reaches significance', group: 'Growth' },
  { key: 'ai.proposal_created', label: 'The assistant proposes a change', group: 'AI' },
] as const

const GROUPS = ['Website', 'Workspace', 'Commerce', 'Growth', 'AI'] as const

const DIGEST = [
  { label: 'Send each notification as it happens', value: 'off' },
  { label: 'Collapse into a daily digest', value: 'daily' },
  { label: 'Collapse into a weekly digest', value: 'weekly' },
]

const ROLE_OPTIONS = ['owner', 'admin', 'marketer', 'sales', 'content_editor', 'support'] as const

interface Rule {
  event: string
  enabled: boolean
  recipients: string[]
  roles: string[]
}

function ruleFor(draft: Record<string, unknown>, event: string): Rule {
  const rules = ((draft.rules as Rule[] | undefined) ?? [])
  return rules.find((rule) => rule.event === event) ?? { event, enabled: false, recipients: [], roles: ['owner'] }
}

function setRule(draft: Record<string, unknown>, event: string, patch: Partial<Rule>) {
  const rules = ((draft.rules as Rule[] | undefined) ?? []).filter((rule) => rule.event !== event)
  draft.rules = [...rules, { ...ruleFor(draft, event), ...patch, event }]
}
</script>

<template>
  <SettingsSection
    section-key="notifications"
    title="E-mail notifications"
    description="What this workspace mails out, and who receives it. Leave the address list empty to notify everyone holding the selected roles."
  >
    <template #default="{ draft }">
      <UiField label="Delivery" help="Bursty events — orders, leads — are much easier to live with as a digest.">
        <template #default="{ id }">
          <UiSelect :id="id" v-model="(draft as any).digest" :options="DIGEST" />
        </template>
      </UiField>

      <div v-for="group in GROUPS" :key="group" class="mt-6 first:mt-5">
        <p class="type-button-10 mb-2 uppercase tracking-[0.08em] text-faint">{{ group }}</p>

        <ul class="flex flex-col divide-y divide-line rounded-lg border border-line">
          <li
            v-for="event in EVENTS.filter((entry) => entry.group === group)"
            :key="event.key"
            class="px-3 py-3"
          >
            <div class="flex items-center justify-between gap-4">
              <p class="type-button-12 min-w-0 text-ink">{{ event.label }}</p>
              <UiSwitch
                :model-value="ruleFor(draft as any, event.key).enabled"
                :label="event.label"
                @update:model-value="(value: boolean) => setRule(draft as any, event.key, { enabled: value })"
              />
            </div>

            <div v-if="ruleFor(draft as any, event.key).enabled" class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p class="type-caption-12 mb-1 text-faint">Specific addresses</p>
                <UiInput
                  :model-value="ruleFor(draft as any, event.key).recipients.join(', ')"
                  placeholder="ops@acme.nl, sales@acme.nl"
                  @update:model-value="
                    (value: string) =>
                      setRule(draft as any, event.key, {
                        recipients: value
                          .split(',')
                          .map((entry) => entry.trim().toLowerCase())
                          .filter(Boolean),
                      })
                  "
                />
              </div>

              <div>
                <p class="type-caption-12 mb-1 text-faint">Or these roles</p>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="role in ROLE_OPTIONS"
                    :key="role"
                    type="button"
                    class="type-button-10 rounded-full border px-2.5 py-1 capitalize transition-colors"
                    :class="
                      ruleFor(draft as any, event.key).roles.includes(role)
                        ? 'border-brand bg-brand-soft text-brand'
                        : 'border-line text-soft hover:border-line-strong hover:text-ink'
                    "
                    @click="
                      setRule(draft as any, event.key, {
                        roles: ruleFor(draft as any, event.key).roles.includes(role)
                          ? ruleFor(draft as any, event.key).roles.filter((entry) => entry !== role)
                          : [...ruleFor(draft as any, event.key).roles, role],
                      })
                    "
                  >
                    {{ role.replace('_', ' ') }}
                  </button>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </SettingsSection>
</template>
