<script setup lang="ts">
definePageMeta({ layout: false })
const config = useRuntimeConfig()
const session = useAdminSession()
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-sunken px-5">
    <UiCard class="max-w-md text-center">
      <h1 class="text-title font-semibold text-ink">Staff access only</h1>
      <p class="mt-2 text-sm leading-relaxed text-soft">
        <template v-if="session?.user">
          You are signed in as {{ session.user.email }}, which is not a platform staff account.
        </template>
        <template v-else> Sign in to the customer dashboard first — this console uses the same session. </template>
      </p>
      <UiButton class="mt-5" variant="primary" :to="config.public.dashboardUrl" external>
        Go to the dashboard
      </UiButton>
    </UiCard>
  </main>
</template>
