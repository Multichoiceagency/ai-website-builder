<script setup lang="ts">
import { computed, inject, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    heading?: string
    intro?: string
    submitLabel?: string
    successMessage?: string
    showPhone?: boolean
    requireConsent?: boolean
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  {
    heading: '',
    intro: '',
    submitLabel: 'Send',
    successMessage: 'Thanks — we will get back to you shortly.',
    showPhone: true,
    requireConsent: true,
    headingLevel: 'h2',
  },
)

const editing = inject<boolean>('layoutCanvasEditing', false)

const name = ref('')
const email = ref('')
const phone = ref('')
const message = ref('')
const consent = ref(false)
const botField = ref('')
const busy = ref(false)
const done = ref(false)
const error = ref('')

const canSubmit = computed(() => {
  if (editing) return false
  if (!email.value.trim() && !phone.value.trim()) return false
  if (props.requireConsent && !consent.value) return false
  return true
})

async function submit() {
  error.value = ''
  done.value = false
  if (!canSubmit.value) {
    error.value = 'Fill in an e-mail or phone number, and consent if asked.'
    return
  }
  busy.value = true
  try {
    const host = import.meta.client
      ? window.location.hostname
      : (useRequestURL().hostname || 'localhost')
    await $fetch('/public/leads', {
      method: 'POST',
      body: {
        host,
        formKey: 'contact-form-01',
        name: name.value.trim() || undefined,
        email: email.value.trim() || undefined,
        phone: phone.value.trim() || undefined,
        message: message.value.trim() || undefined,
        consent: consent.value,
        botField: botField.value,
      },
    })
    done.value = true
    name.value = ''
    email.value = ''
    phone.value = ''
    message.value = ''
    consent.value = false
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not send that message.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="mx-auto max-w-xl">
      <component
        v-if="heading"
        :is="headingLevel"
        class="text-[clamp(1.625rem,1.2rem+1.6vw,2.25rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        {{ heading }}
      </component>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">
        {{ intro }}
      </p>

      <p
        v-if="editing"
        class="mt-6 rounded-lg border border-dashed border-[var(--site-line)] px-3 py-2 text-[0.8125rem] text-[var(--site-text-muted)]"
      >
        Form is live on the published site. Submissions appear under CRM → Leads.
      </p>

      <form class="mt-8 flex flex-col gap-4" @submit.prevent="submit">
        <label class="block">
          <span class="mb-1.5 block text-[0.875rem] font-medium text-[var(--site-text)]">Name</span>
          <input
            v-model="name"
            type="text"
            name="name"
            autocomplete="name"
            class="w-full rounded-[var(--site-radius)] border border-[var(--site-line)] bg-[var(--site-surface)] px-3 py-2.5 text-[1rem] text-[var(--site-text)] outline-none"
            :disabled="editing || busy"
          />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[0.875rem] font-medium text-[var(--site-text)]">E-mail</span>
          <input
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
            class="w-full rounded-[var(--site-radius)] border border-[var(--site-line)] bg-[var(--site-surface)] px-3 py-2.5 text-[1rem] text-[var(--site-text)] outline-none"
            :disabled="editing || busy"
          />
        </label>
        <label v-if="showPhone" class="block">
          <span class="mb-1.5 block text-[0.875rem] font-medium text-[var(--site-text)]">Phone</span>
          <input
            v-model="phone"
            type="tel"
            name="phone"
            autocomplete="tel"
            class="w-full rounded-[var(--site-radius)] border border-[var(--site-line)] bg-[var(--site-surface)] px-3 py-2.5 text-[1rem] text-[var(--site-text)] outline-none"
            :disabled="editing || busy"
          />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[0.875rem] font-medium text-[var(--site-text)]">Message</span>
          <textarea
            v-model="message"
            name="message"
            rows="4"
            class="w-full rounded-[var(--site-radius)] border border-[var(--site-line)] bg-[var(--site-surface)] px-3 py-2.5 text-[1rem] text-[var(--site-text)] outline-none"
            :disabled="editing || busy"
          />
        </label>
        <label class="sr-only" aria-hidden="true">
          Company
          <input v-model="botField" type="text" tabindex="-1" autocomplete="off" />
        </label>
        <label v-if="requireConsent" class="flex items-start gap-2 text-[0.875rem] text-[var(--site-text)]">
          <input v-model="consent" type="checkbox" class="mt-1" :disabled="editing || busy" />
          <span>I agree that you may use this message to contact me.</span>
        </label>
        <p v-if="error" class="text-[0.875rem] text-red-600" role="alert">{{ error }}</p>
        <p v-if="done" class="text-[0.875rem] text-[var(--site-text)]" role="status">{{ successMessage }}</p>
        <button
          type="submit"
          class="inline-flex min-h-11 items-center justify-center rounded-[var(--site-radius)] bg-[var(--site-primary)] px-5 text-[1rem] font-semibold text-[var(--site-primary-ink,#fff)] disabled:opacity-40"
          :disabled="editing || busy"
        >
          {{ busy ? 'Sending…' : submitLabel }}
        </button>
      </form>
    </div>
  </div>
</template>
