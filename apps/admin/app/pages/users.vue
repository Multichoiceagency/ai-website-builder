<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const api = useAdminApi()
const config = useRuntimeConfig()
const session = useAdminSession()
const search = ref('')

interface UserRow {
  id: string
  email: string
  name: string
  createdAt: string
  tenantCount: number
  tenants: string
  isPlatformAdmin: boolean
  lastSeenAt: string | null
}

const { data: users, pending, refresh, error: loadError } = await useAsyncData(
  'admin:users',
  () => api.get<UserRow[]>('/users', { search: search.value || undefined }),
  { watch: [search] },
)

const impersonating = ref<string | null>(null)
const staffing = ref<string | null>(null)
const error = ref('')

const sorted = computed(() => {
  const rows = [...(users.value ?? [])]
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

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

async function setStaff(user: UserRow, staff: boolean) {
  error.value = ''
  staffing.value = user.id
  try {
    await api.post<{ id: string; isPlatformAdmin: boolean }>(`/users/${user.id}/staff`, { staff })
    await refresh()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not update staff access.'
  } finally {
    staffing.value = null
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function relative(iso: string | null): string {
  if (!iso) return 'never'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void refresh(), 250)
})
</script>

<template>
  <div>
    <UiPageHeader
      title="Registered users"
      :description="`${users?.length ?? 0} account(s) on this platform — who signed up, when, and which workspace.`"
    />

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <UiField v-slot="{ id }" label="Search" class="min-w-[16rem] flex-1">
        <UiInput :id="id" v-model="search" placeholder="Name, email, workspace…" />
      </UiField>
    </div>

    <p
      v-if="error || loadError"
      class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger"
      role="alert"
    >
      {{ error || (loadError instanceof Error ? loadError.message : 'Failed to load users.') }}
    </p>

    <UiCard :padded="false">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr class="border-b border-line text-[0.75rem] uppercase tracking-[0.06em] text-faint">
              <th scope="col" class="px-4 py-2.5 font-semibold">User</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">Workspace</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">Registered</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">Last seen</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">Role</th>
              <th scope="col" class="px-4 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="user in sorted" :key="user.id" class="align-top hover:bg-sunken/60">
              <td class="px-4 py-3">
                <span class="block font-medium text-ink">{{ user.name }}</span>
                <span class="block text-[0.75rem] text-faint">{{ user.email }}</span>
              </td>
              <td class="px-4 py-3 text-[0.8125rem] text-soft">
                {{ user.tenants || '—' }}
                <span v-if="user.tenantCount > 1" class="text-faint"> · {{ user.tenantCount }}</span>
              </td>
              <td class="px-4 py-3 text-[0.8125rem] text-soft">
                <span class="block">{{ formatDate(user.createdAt) }}</span>
              </td>
              <td class="px-4 py-3 text-[0.8125rem] text-faint">{{ relative(user.lastSeenAt) }}</td>
              <td class="px-4 py-3">
                <UiBadge v-if="user.isPlatformAdmin" tone="brand">Staff</UiBadge>
                <span v-else class="text-[0.8125rem] text-faint">Customer</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap justify-end gap-2">
                  <UiButton
                    size="sm"
                    :loading="impersonating === user.id"
                    :disabled="Boolean(impersonating) || user.id === session?.user.id"
                    @click="impersonate(user.id)"
                  >
                    Impersonate
                  </UiButton>
                  <UiButton
                    v-if="!user.isPlatformAdmin"
                    size="sm"
                    variant="ghost"
                    :loading="staffing === user.id"
                    :disabled="Boolean(staffing)"
                    @click="setStaff(user, true)"
                  >
                    Make staff
                  </UiButton>
                  <UiButton
                    v-else-if="user.id !== session?.user.id"
                    size="sm"
                    variant="ghost"
                    :loading="staffing === user.id"
                    :disabled="Boolean(staffing)"
                    @click="setStaff(user, false)"
                  >
                    Remove staff
                  </UiButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="pending && !users?.length" class="px-4 py-8 text-center text-[0.8125rem] text-faint">Loading…</p>
      <p v-else-if="!sorted.length" class="px-4 py-8 text-center text-[0.8125rem] text-faint">No users match.</p>
    </UiCard>
  </div>
</template>
