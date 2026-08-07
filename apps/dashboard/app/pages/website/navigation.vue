<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Navigation, NavigationItem } from '@platform/schemas'

const api = useApi()
const activeSiteId = useActiveSiteId()

const { data: navigation, refresh } = await useAsyncData(
  () => `website:nav:${activeSiteId.value}`,
  () => (activeSiteId.value ? api.get<Navigation[]>(`/api/v1/sites/${activeSiteId.value}/navigation`) : Promise.resolve([])),
  { watch: [activeSiteId], default: () => [] as Navigation[] },
)

const menus = ref<Record<'primary' | 'footer', NavigationItem[]>>({ primary: [], footer: [] })
const saving = ref<string | null>(null)
const saved = ref('')

watch(
  navigation,
  (value) => {
    menus.value = {
      primary: value?.find((menu) => menu.key === 'primary')?.items ?? [],
      footer: value?.find((menu) => menu.key === 'footer')?.items ?? [],
    }
  },
  { immediate: true },
)

function add(key: 'primary' | 'footer') {
  menus.value[key] = [...menus.value[key], { label: 'New link', href: '/' }]
}

function remove(key: 'primary' | 'footer', index: number) {
  menus.value[key] = menus.value[key].filter((_, i) => i !== index)
}

function move(key: 'primary' | 'footer', index: number, delta: number) {
  const items = [...menus.value[key]]
  const target = index + delta
  if (target < 0 || target >= items.length) return
  const [moved] = items.splice(index, 1)
  items.splice(target, 0, moved!)
  menus.value[key] = items
}

async function save(key: 'primary' | 'footer') {
  saving.value = key
  saved.value = ''
  try {
    await api.put(`/api/v1/sites/${activeSiteId.value}/navigation/${key}`, { items: menus.value[key] })
    saved.value = key
    await refresh()
    setTimeout(() => (saved.value = ''), 2500)
  } finally {
    saving.value = null
  }
}
</script>

<template>
  <div>
    <UiPageHeader title="Navigation" description="The menus your visitors use to move around the site." />

    <UiEmptyState v-if="!activeSiteId" title="No website selected" description="Create a website first." />

    <div v-else class="grid gap-5 lg:grid-cols-2 lg:items-start">
      <UiCard v-for="key in (['primary', 'footer'] as const)" :key="key">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-heading font-semibold capitalize text-ink">{{ key }} menu</h2>
          <UiButton size="sm" variant="ghost" @click="add(key)">+ Add link</UiButton>
        </div>

        <ul v-if="menus[key].length" class="flex flex-col gap-2">
          <li v-for="(item, index) in menus[key]" :key="index" class="rounded-lg border border-line p-3">
            <div class="mb-2 flex items-center justify-end gap-0.5">
              <button type="button" class="grid h-6 w-6 place-items-center rounded text-faint hover:text-ink disabled:opacity-30" :disabled="index === 0" aria-label="Move up" @click="move(key, index, -1)">&uarr;</button>
              <button type="button" class="grid h-6 w-6 place-items-center rounded text-faint hover:text-ink disabled:opacity-30" :disabled="index === menus[key].length - 1" aria-label="Move down" @click="move(key, index, 1)">&darr;</button>
              <button type="button" class="grid h-6 w-6 place-items-center rounded text-faint hover:text-danger" aria-label="Remove" @click="remove(key, index)">&times;</button>
            </div>
            <div class="grid gap-2 sm:grid-cols-2">
              <UiField v-slot="{ id }" label="Label"><UiInput :id="id" v-model="item.label" /></UiField>
              <UiField v-slot="{ id }" label="Link"><UiInput :id="id" v-model="item.href" /></UiField>
            </div>
          </li>
        </ul>
        <p v-else class="py-6 text-center text-[0.8125rem] text-faint">No links yet.</p>

        <div class="mt-4 flex items-center gap-3">
          <UiButton variant="primary" :loading="saving === key" @click="save(key)">Save {{ key }}</UiButton>
          <p v-if="saved === key" class="text-[0.8125rem] text-positive">Saved.</p>
        </div>
      </UiCard>
    </div>
  </div>
</template>
