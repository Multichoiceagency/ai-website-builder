<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import type { WizardAnswers, WizardStep } from '../utils/assistantWizard'

const props = defineProps<{
  steps: WizardStep[]
  goalLabel: string
}>()

const emit = defineEmits<{
  complete: [answers: WizardAnswers]
  skip: []
  cancel: []
}>()

const index = ref(0)
const answers = ref<WizardAnswers>({})
const customText = ref('')

const step = computed(() => props.steps[index.value]!)
const total = computed(() => props.steps.length)
const progress = computed(() => `${index.value + 1} / ${total.value}`)

watch(
  () => step.value.id,
  () => {
    const existing = answers.value[step.value.id]
    if (typeof existing === 'string') customText.value = existing
    else customText.value = ''
  },
)

function selectChoice(id: string) {
  answers.value = { ...answers.value, [step.value.id]: id }
}

function toggleMulti(id: string) {
  const current = Array.isArray(answers.value[step.value.id])
    ? [...(answers.value[step.value.id] as string[])]
    : []
  const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
  answers.value = { ...answers.value, [step.value.id]: next }
}

function isSelected(id: string) {
  const value = answers.value[step.value.id]
  if (Array.isArray(value)) return value.includes(id)
  return value === id
}

function commitText() {
  const trimmed = customText.value.trim()
  if (trimmed) answers.value = { ...answers.value, [step.value.id]: trimmed }
}

function canAdvance() {
  const value = answers.value[step.value.id]
  if (step.value.kind === 'text') return true
  if (step.value.kind === 'multi') return Array.isArray(value) && value.length > 0
  return typeof value === 'string' && value.length > 0
}

function next() {
  if (step.value.kind === 'text') commitText()
  if (index.value >= total.value - 1) {
    emit('complete', { ...answers.value })
    return
  }
  index.value += 1
}

function back() {
  if (index.value > 0) index.value -= 1
}

function skipStep() {
  if (index.value >= total.value - 1) {
    emit('complete', { ...answers.value })
    return
  }
  index.value += 1
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-line/80 bg-white shadow-sm">
    <div class="border-b border-line/70 bg-[#f7f7f5] px-3.5 py-2.5">
      <p class="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-faint">Waiting for answers</p>
      <p class="mt-0.5 text-[0.8125rem] text-soft">
        Designing {{ goalLabel }}
        <span class="text-faint"> · {{ progress }}</span>
      </p>
    </div>

    <div class="px-3.5 py-3.5">
      <p class="text-[0.9375rem] font-semibold leading-snug text-ink">{{ step.question }}</p>
      <p v-if="step.hint" class="mt-1 text-[0.75rem] leading-relaxed text-soft">{{ step.hint }}</p>

      <!-- Palette strips -->
      <ul v-if="step.kind === 'palette'" class="mt-3 flex flex-col gap-2">
        <li v-for="option in step.options" :key="option.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors"
            :class="
              isSelected(option.id)
                ? 'border-ink bg-ink/[0.03] ring-1 ring-ink/20'
                : 'border-line hover:border-ink/30'
            "
            @click="selectChoice(option.id)"
          >
            <span class="flex h-8 flex-1 overflow-hidden rounded-lg">
              <span
                v-for="(swatch, i) in option.swatches"
                :key="`${option.id}-${i}`"
                class="h-full flex-1"
                :style="{ background: swatch }"
              />
            </span>
            <span class="w-24 shrink-0 text-[0.75rem] font-medium text-ink">{{ option.label }}</span>
          </button>
        </li>
      </ul>

      <!-- Single / multi choice chips -->
      <ul v-else-if="step.kind === 'choice' || step.kind === 'multi'" class="mt-3 flex flex-col gap-1.5">
        <li v-for="option in step.options" :key="option.id">
          <button
            type="button"
            class="flex w-full flex-col rounded-xl border px-3 py-2.5 text-left transition-colors"
            :class="
              isSelected(option.id)
                ? 'border-ink bg-ink/[0.03] ring-1 ring-ink/15'
                : 'border-line hover:border-ink/25'
            "
            @click="step.kind === 'multi' ? toggleMulti(option.id) : selectChoice(option.id)"
          >
            <span class="text-[0.8125rem] font-medium text-ink">{{ option.label }}</span>
            <span v-if="option.description" class="mt-0.5 text-[0.6875rem] text-soft">{{ option.description }}</span>
          </button>
        </li>
      </ul>

      <!-- Free text -->
      <div v-else class="mt-3">
        <input
          v-model="customText"
          type="text"
          class="h-10 w-full rounded-xl border border-line bg-raised px-3 text-[0.8125rem] text-ink outline-none placeholder:text-faint focus:border-ink/30"
          :placeholder="step.placeholder || 'Write your own…'"
          @keydown.enter.prevent="next"
        />
      </div>

      <!-- Custom override for palette / choice -->
      <div v-if="step.kind === 'palette' || step.kind === 'choice'" class="mt-2">
        <input
          v-model="customText"
          type="text"
          class="h-9 w-full rounded-xl border border-dashed border-line bg-transparent px-3 text-[0.75rem] text-ink outline-none placeholder:text-faint focus:border-ink/30"
          placeholder="Write your own…"
          @change="
            () => {
              if (customText.trim()) selectChoice(customText.trim())
            }
          "
        />
      </div>
    </div>

    <div class="flex items-center gap-2 border-t border-line/70 px-3 py-2.5">
      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-lg text-soft hover:bg-sunken hover:text-ink disabled:opacity-30"
        :disabled="index === 0"
        aria-label="Previous question"
        @click="back"
      >
        <ChevronLeft class="h-4 w-4" :stroke-width="1.75" />
      </button>
      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-lg text-soft hover:bg-sunken hover:text-ink"
        aria-label="Next question"
        @click="skipStep"
      >
        <ChevronRight class="h-4 w-4" :stroke-width="1.75" />
      </button>
      <button type="button" class="ml-1 text-[0.75rem] text-faint hover:text-ink" @click="emit('skip')">
        Skip all
      </button>
      <UiButton
        class="ml-auto"
        size="sm"
        variant="primary"
        :disabled="step.kind !== 'text' && !canAdvance()"
        @click="next"
      >
        {{ index >= total - 1 ? 'Build' : 'Next' }}
      </UiButton>
    </div>
  </div>
</template>
