<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * A credential field.
 *
 * The stored value has no representation here because it has none in the API
 * either — the server returns `{ configured, hint }` and nothing else. So this
 * control has exactly two states: "not set, type one" and "set, here is its
 * tail, replace or remove it". There is no reveal affordance, because there is
 * nothing to reveal.
 */
const props = withDefaults(
  defineProps<{
    scope: 'platform' | 'commerce'
    sectionKey: string
    field: string
    label: string
    help?: string
    state?: { field: string; configured: boolean; hint: string | null; updatedAt: string | null } | null
  }>(),
  { help: '', state: null },
)

const emit = defineEmits<{ changed: [] }>()

const api = useApi()

const entering = ref(false)
const value = ref('')
const busy = ref(false)
const error = ref('')

const configured = computed(() => Boolean(props.state?.configured))
const basePath = computed(() =>
  `/api/v1/settings/${props.scope}/${props.sectionKey}/secrets`,
)

async function submit() {
  if (value.value.trim().length < 4) {
    error.value = 'That looks too short to be a credential.'
    return
  }

  busy.value = true
  error.value = ''
  try {
    await api.put(basePath.value, { field: props.field, value: value.value.trim() })
    // Cleared immediately: the value must not linger in memory or in a devtools
    // component inspector any longer than the request itself.
    value.value = ''
    entering.value = false
    emit('changed')
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Could not store this credential.'
  } finally {
    busy.value = false
  }
}

async function remove() {
  busy.value = true
  error.value = ''
  try {
    await api.request(`${basePath.value}/${props.field}`, { method: 'DELETE', body: { confirm: true } })
    emit('changed')
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Could not remove this credential.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <span class="type-caption text-soft">{{ label }}</span>
      <UiBadge :tone="configured ? 'positive' : 'neutral'">
        {{ configured ? 'Configured' : 'Not set' }}
      </UiBadge>
    </div>

    <div v-if="configured && !entering" class="flex flex-wrap items-center gap-2">
      <code class="rounded-md border border-line bg-sunken px-2.5 py-1.5 font-mono text-[0.75rem] text-soft">
        {{ state?.hint }}
      </code>
      <UiButton size="sm" :disabled="busy" @click="entering = true">Replace</UiButton>
      <UiButton size="sm" variant="ghost" :disabled="busy" @click="remove">Remove</UiButton>
    </div>

    <div v-else class="flex flex-wrap items-center gap-2">
      <input
        v-model="value"
        type="password"
        autocomplete="off"
        spellcheck="false"
        :placeholder="`Paste the ${label.toLowerCase()}`"
        class="h-9 min-w-0 flex-1 rounded-lg border border-line bg-raised px-3 font-mono text-[0.75rem] text-ink transition-colors placeholder:font-sans placeholder:text-faint hover:border-line-strong"
      />
      <UiButton size="sm" variant="primary" :loading="busy" @click="submit">Store</UiButton>
      <UiButton v-if="configured" size="sm" variant="ghost" @click="entering = false">Cancel</UiButton>
    </div>

    <p v-if="error" class="type-caption-12 text-danger" role="alert">{{ error }}</p>
    <p v-else-if="help" class="type-caption-12 text-faint">{{ help }}</p>
    <p v-else-if="configured && state?.updatedAt" class="type-caption-12 text-faint">
      Updated {{ new Date(state.updatedAt).toLocaleDateString() }} · stored encrypted, never shown again.
    </p>
  </div>
</template>
