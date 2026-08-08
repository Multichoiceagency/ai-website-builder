<script setup lang="ts">
/**
 * Step 1 — account. Session is required by auth middleware; confirm and continue.
 * The orchestrator skips this step when the user already completed it.
 */

const session = useSession()

const emit = defineEmits<{
  continue: []
}>()
</script>

<template>
  <div class="rounded-xl border border-line bg-raised p-6 shadow-card">
    <template v-if="session">
      <p class="text-sm text-soft">
        Signed in as
        <strong class="font-semibold text-ink">{{ session.user.email }}</strong>.
      </p>
      <p class="mt-2 text-[0.8125rem] leading-relaxed text-faint">
        Your workspace is ready — next, tell us what you want to build.
      </p>
      <UiButton class="mt-5" variant="primary" size="lg" arrow @click="emit('continue')">
        Continue
      </UiButton>
    </template>
    <template v-else>
      <p class="text-sm text-soft">Create an account to continue.</p>
      <UiButton class="mt-5" variant="primary" to="/login?redirect=/onboarding" arrow>
        Sign in or register
      </UiButton>
    </template>
  </div>
</template>
