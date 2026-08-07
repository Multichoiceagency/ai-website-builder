<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * A destructive action, gated the way the API gates it.
 *
 * The server refuses any of these without an explicit `confirm` in the body, so
 * this dialog is not decoration — it produces the field that makes the request
 * legal. Two strengths: a checkbox-equivalent acknowledgement (`confirm: true`)
 * and a typed phrase for the ones that cannot be undone.
 */
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    actionLabel: string
    /** When set, the user must type this exact string before the action arms. */
    confirmPhrase?: string
    /** Extra body fields sent alongside the confirmation. */
    payload?: Record<string, unknown>
    method?: 'POST' | 'DELETE' | 'PATCH'
    path: string
    disabled?: boolean
    disabledReason?: string
  }>(),
  {
    description: '',
    confirmPhrase: '',
    payload: () => ({}),
    method: 'POST',
    disabled: false,
    disabledReason: '',
  },
)

const emit = defineEmits<{ done: [unknown] }>()

const api = useApi()

const open = ref(false)
const typed = ref('')
const busy = ref(false)
const error = ref('')

const armed = computed(() => (props.confirmPhrase ? typed.value === props.confirmPhrase : true))

watch(open, (value) => {
  if (!value) {
    typed.value = ''
    error.value = ''
  }
})

async function run() {
  if (!armed.value) return

  busy.value = true
  error.value = ''
  try {
    const result = await api.request(props.path, {
      method: props.method,
      // `confirm` is a typed phrase where one is required and `true` otherwise —
      // matching the two confirmation shapes the API accepts.
      body: { ...props.payload, confirm: props.confirmPhrase ? typed.value : true },
    })
    open.value = false
    emit('done', result)
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'That action could not be completed.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <UiButton
      variant="danger"
      size="sm"
      :disabled="disabled"
      :title="disabled ? disabledReason : undefined"
      @click="open = true"
    >
      {{ actionLabel }}
    </UiButton>

    <UiDialog v-model:open="open" :title="title" :description="description">
      <div class="flex flex-col gap-4">
        <p class="type-caption-12 text-soft">
          This is recorded in the audit log with your name against it.
        </p>

        <UiField
          v-if="confirmPhrase"
          :label="`Type ${confirmPhrase} to confirm`"
          :error="error"
        >
          <template #default="{ id, describedBy }">
            <UiInput :id="id" v-model="typed" :described-by="describedBy" autocomplete="off" />
          </template>
        </UiField>

        <p v-else-if="error" class="type-caption-12 text-danger" role="alert">{{ error }}</p>
      </div>

      <template #footer>
        <UiButton size="sm" @click="open = false">Cancel</UiButton>
        <UiButton size="sm" variant="danger" :loading="busy" :disabled="!armed" @click="run">
          {{ actionLabel }}
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
