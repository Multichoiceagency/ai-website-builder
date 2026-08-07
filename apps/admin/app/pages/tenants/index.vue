<script setup lang="ts">
import { computed, ref } from 'vue'

const api = useAdminApi()
const search = ref('')

interface TenantRow {
  id: string; name: string; slug: string; plan: string; organizationName: string
  createdAt: string; members: number; sites: number; pages: number; publishedPages: number
  lastActivityAt: string | null
}

const { data: tenants } = await useAsyncData('admin:tenants', () => api.get<TenantRow[]>('/tenants'))

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return tenants.value ?? []
  return (tenants.value ?? []).filter((row) => `${row.name} ${row.slug} ${row.organizationName}`.toLowerCase().includes(term))
})

function relative(iso: string | null): string {
  if (!iso) return 'never'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'today'
  return `${days}d ago`
}
</script>

<template>
  <div>
    <UiPageHeader title="Clients" :description="`${tenants?.length ?? 0} workspace(s)`" />

    <div class="mb-4 max-w-sm">
      <UiInput v-model="search" placeholder="Search by name or slug…" />
    </div>

    <UiCard :padded="false">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[46rem] text-left text-sm">
          <thead>
            <tr class="border-b border-line text-[0.75rem] uppercase tracking-[0.06em] text-faint">
              <th scope="col" class="px-4 py-2.5 font-semibold">Client</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">Plan</th>
              <th scope="col" class="px-4 py-2.5 text-right font-semibold">Users</th>
              <th scope="col" class="px-4 py-2.5 text-right font-semibold">Sites</th>
              <th scope="col" class="px-4 py-2.5 text-right font-semibold">Published</th>
              <th scope="col" class="px-4 py-2.5 text-right font-semibold">Last active</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="row in filtered" :key="row.id" class="transition-colors hover:bg-sunken/60">
              <td class="px-4 py-3">
                <NuxtLink :to="`/tenants/${row.id}`" class="no-underline">
                  <span class="block font-medium text-ink">{{ row.name }}</span>
                  <span class="block text-[0.75rem] text-faint">{{ row.slug }}</span>
                </NuxtLink>
              </td>
              <td class="px-4 py-3"><UiBadge tone="brand">{{ row.plan }}</UiBadge></td>
              <td class="px-4 py-3 text-right tabular-nums text-soft">{{ row.members }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-soft">{{ row.sites }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-soft">{{ row.publishedPages }}/{{ row.pages }}</td>
              <td class="px-4 py-3 text-right text-[0.8125rem] text-faint">{{ relative(row.lastActivityAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="!filtered.length" class="px-4 py-10 text-center text-[0.8125rem] text-faint">No clients match.</p>
    </UiCard>
  </div>
</template>
