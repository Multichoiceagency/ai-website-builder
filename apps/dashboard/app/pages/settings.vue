<script setup lang="ts">
/**
 * The settings shell (§39).
 *
 * A parent route: this file owns the header and the section rail, and each
 * section is a child page. That is deliberate — settings is the one place where
 * a URL has to be linkable ("here is where you rotate the key"), and a tabbed
 * single page cannot do that.
 */
const membership = useActiveMembership()
const can = useCan()

const groups = computed(() => [
  {
    label: 'Workspace',
    items: [
      { label: 'General', to: '/settings' },
      { label: 'Team', to: '/settings/team' },
      { label: 'Plan & usage', to: '/settings/plan' },
      { label: 'Domains', to: '/settings/domains' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Integrations', to: '/settings/integrations' },
      { label: 'CMS', to: '/settings/cms' },
      { label: 'AI', to: '/settings/ai' },
      { label: 'Onboarding', to: '/settings/onboarding' },
      { label: 'Notifications', to: '/settings/notifications' },
    ],
  },
  {
    label: 'Governance',
    items: [
      ...(can('developer:read') ? [{ label: 'Developer', to: '/settings/developer' }] : []),
      ...(can('audit:read') ? [{ label: 'Audit log', to: '/settings/audit' }] : []),
      { label: 'Data & privacy', to: '/settings/data' },
    ],
  },
  {
    label: 'Store',
    items: [{ label: 'Commerce settings', to: '/commerce/settings' }],
  },
])
</script>

<template>
  <div class="editor-chrome">
    <UiPageHeader
      title="Settings"
      :description="membership ? `${membership.tenantName} · ${membership.plan} plan` : ''"
    />

    <div class="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
      <SettingsNav :groups="groups" />

      <div class="min-w-0">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>
