<script setup lang="ts">
import { ref, watch } from 'vue'

const api = useAdminApi()
const config = useRuntimeConfig()
const search = ref('')

interface UserRow {
  id: string
  email: string
  name: string
  createdAt: string
  tenantCount: number
  tenants: string
}

const { data: users, pending, refresh } = await useAsyncData(
  'admin:users',
  () => api.get<UserRow[]>('/users', { search: search.value || undefined }),
  { watch: [search] },
)

const impersonating = ref<string | null>(null)
const error = ref('')

async function impersonate(userId: string) {
  error.value = ''
  impersonating.value = userId
  try {
    const result = await api.post<{
      token: string
      tenantId: string
      dashboardUrl: string
      user: { email: string }
    }>('/impersonate', { userId })
    const url = new URL('/impersonate', config.public.dashboardUrl)
    url.searchParams.set('token', result.token)
    url.searchParams.set('tenantId', result.tenantId)
    window.open(url.toString(), '_blank', 'noopener')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Impersonation failed.'
  } finally {
    impersonating.value = null
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void refresh(), 250)
})
</script>

<template>
  <div>
    <UiPageHeader title="Users" description="Everyone on the platform — email and workspace names only." />

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <UiField v-slot="{ id }" label="Search" class="min-w-[16rem] flex-1">
        <UiInput :id="id" v-model="search" placeholder="Name, email, workspace…" />
      </UiField>
    </div>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <UiCard :padded="false">
      <ul v-if="users?.length" class="divide-y divide-line">
        <li
          v-for="user in users"
          :key="user.id"
          class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <span class="min-w-0">
            <span class="block truncate text-[0.8125rem] font-medium text-ink">{{ user.name }}</span>
            <span class="block truncate text-[0.75rem] text-faint">{{ user.email }}</span>
            <span class="mt-0.5 block truncate text-[0.75rem] text-soft">
              {{ user.tenants || 'No workspace' }}
              <span v-if="user.tenantCount > 1"> · {{ user.tenantCount }} workspaces</span>
            </span>
          </span>
          <UiButton
            size="sm"
            :loading="impersonating === user.id"
            :disabled="Boolean(impersonating)"
            @click="impersonate(user.id)"
          >
            Impersonate
          </UiButton>
        </li>
      </ul>
      <p v-else-if="pending" class="px-4 py-8 text-center text-[0.8125rem] text-faint">Loading…</p>
      <p v-else class="px-4 py-8 text-center text-[0.8125rem] text-faint">No users match.</p>
    </UiCard>
  </div>
</template>
