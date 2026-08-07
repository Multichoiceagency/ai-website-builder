<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { Section } from '@platform/schemas'

/**
 * Ask AI to edit one section.
 *
 * The model never writes. It returns a **proposal**, which is shown here as a
 * field-by-field before/after, and only an explicit Apply turns it into a
 * change (ADR-0007). The dialog also states which model answered, because
 * "a rule shortened your headline" and "Claude rewrote your headline" are
 * different facts and the person deciding deserves to know which one happened.
 *
 * Rebuild-with-AI passes `initialInstruction` + `autoApply` so the MotionSites
 * prompt runs and lands without a second confirmation.
 */
const props = defineProps<{
  pageId: string
  section: Section | null
  blockName: string
  /** Prefill when opened from MotionSites rebuild / background. */
  initialInstruction?: string
  /** After a successful suggest with changes, apply without waiting for a click. */
  autoApply?: boolean
}>()

const emit = defineEmits<{ apply: [props: Record<string, unknown>] }>()

const open = defineModel<boolean>('open', { default: false })

interface FieldChange {
  path: string
  label: string
  before: string
  after: string
}

interface Proposal {
  sectionId: string
  blockId: string
  blockName: string
  instruction: string
  model: string
  notes: string[]
  current: Record<string, unknown>
  proposed: Record<string, unknown>
  changedFields: FieldChange[]
  refusedFields: { path: string; label: string; reason: string }[]
}

const api = useApi()

const instruction = ref('')
const proposal = ref<Proposal | null>(null)
const busy = ref(false)
const applying = ref(false)
const errorMessage = ref('')
const supported = ref<string[]>([])

/** Openers that the deterministic composer can honour with no key at all. */
const EXAMPLES = [
  'Make this punchier',
  'Shorten the supporting text',
  'Sentence case the headline',
  'Rewrite this from the business profile',
]

const hasChanges = computed(() => (proposal.value?.changedFields.length ?? 0) > 0)

watch(open, async (isOpen) => {
  if (isOpen) {
    instruction.value = props.initialInstruction?.trim() ?? ''
    proposal.value = null
    errorMessage.value = ''
    supported.value = []
    if (instruction.value) {
      await nextTick()
      await suggest()
    }
    return
  }
  instruction.value = ''
  proposal.value = null
  errorMessage.value = ''
  supported.value = []
})

async function suggest() {
  if (!props.section || !instruction.value.trim()) return

  busy.value = true
  errorMessage.value = ''
  supported.value = []
  proposal.value = null

  try {
    proposal.value = await api.post<Proposal>(
      `/api/v1/pages/${props.pageId}/sections/${props.section.id}/suggest`,
      // The editor's live values, which may not be saved yet — otherwise the
      // model would reason about a headline the user has already replaced.
      { instruction: instruction.value, props: props.section.props },
    )
    if (props.autoApply && (proposal.value?.changedFields.length ?? 0) > 0) {
      await apply()
    }
  } catch (caught) {
    if (caught instanceof ApiError) {
      errorMessage.value = caught.message
      const details = caught.details as { supported?: string[] } | undefined
      supported.value = details?.supported ?? []
    } else {
      errorMessage.value = 'Could not reach the platform API.'
    }
  } finally {
    busy.value = false
  }
}

/**
 * Applying is a user's write. The server re-validates and re-runs the
 * required-field guard, records it against the agent on the user's behalf, and
 * only then does the canvas take the change — as one undo step.
 */
async function apply() {
  const current = proposal.value
  if (!current || !props.section) return

  applying.value = true
  errorMessage.value = ''

  try {
    await api.post(`/api/v1/pages/${props.pageId}/sections/${props.section.id}/apply`, {
      props: current.proposed,
      model: current.model,
      instruction: current.instruction,
    })
    emit('apply', current.proposed)
    open.value = false
  } catch (caught) {
    errorMessage.value = caught instanceof ApiError ? caught.message : 'Could not apply the change.'
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    wide
    title="Ask AI to edit this section"
    :description="blockName"
  >
    <div class="flex flex-col gap-4">
      <UiField v-slot="{ id }" label="What should change?" help="Plain language. Nothing is applied until you say so.">
        <UiTextarea
          :id="id"
          v-model="instruction"
          :rows="2"
          placeholder="Make this punchier"
          @keydown.enter.meta.prevent="suggest"
        />
      </UiField>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="example in EXAMPLES"
          :key="example"
          type="button"
          class="type-button-12 rounded-full border border-line px-2.5 py-1 text-soft transition-colors hover:border-line-strong hover:text-ink"
          @click="instruction = example"
        >{{ example }}</button>
      </div>

      <div>
        <UiButton variant="primary" :loading="busy" :disabled="!instruction.trim()" @click="suggest">
          Suggest a change
        </UiButton>
      </div>

      <div v-if="errorMessage" class="rounded-lg bg-danger-soft px-3 py-2.5" role="alert">
        <p class="type-caption-12 leading-relaxed text-danger">{{ errorMessage }}</p>
        <ul v-if="supported.length" class="mt-2 list-disc pl-4">
          <li v-for="entry in supported" :key="entry" class="type-caption-12 text-danger">{{ entry }}</li>
        </ul>
      </div>

      <template v-if="proposal">
        <div class="flex items-center gap-2 border-t border-line pt-4">
          <UiBadge tone="brand">Proposal</UiBadge>
          <span class="type-caption-12 text-soft">answered by <span class="font-medium text-ink">{{ proposal.model }}</span></span>
        </div>

        <p v-for="note in proposal.notes" :key="note" class="type-caption-12 leading-relaxed text-soft">
          {{ note }}
        </p>

        <ul v-if="hasChanges" class="flex flex-col gap-2.5">
          <li
            v-for="change in proposal.changedFields"
            :key="change.path"
            class="rounded-lg border border-line p-3"
          >
            <p class="type-button-10 mb-2 uppercase tracking-[0.08em] text-faint">{{ change.label }}</p>
            <p class="type-caption-12 leading-relaxed text-soft line-through decoration-danger/60">
              {{ change.before || '—' }}
            </p>
            <p class="type-caption-12 mt-1.5 leading-relaxed text-ink">{{ change.after || '—' }}</p>
          </li>
        </ul>

        <p v-else class="type-caption-12 text-soft">
          Nothing to change — the section already reads that way.
        </p>

        <ul v-if="proposal.refusedFields.length" class="flex flex-col gap-2">
          <li
            v-for="refused in proposal.refusedFields"
            :key="refused.path"
            class="rounded-lg bg-warning-soft px-3 py-2"
          >
            <p class="type-caption-12 leading-relaxed text-warning">
              <span class="font-medium">{{ refused.label }}:</span> {{ refused.reason }}
            </p>
          </li>
        </ul>
      </template>
    </div>

    <template #footer>
      <UiButton @click="open = false">Cancel</UiButton>
      <UiButton
        variant="primary"
        :loading="applying"
        :disabled="!hasChanges"
        @click="apply"
      >Apply {{ proposal?.changedFields.length ?? 0 }} change{{ (proposal?.changedFields.length ?? 0) === 1 ? '' : 's' }}</UiButton>
    </template>
  </UiDialog>
</template>
