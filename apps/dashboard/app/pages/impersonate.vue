<script setup lang="ts">
/**
 * Claims an admin-issued impersonation token and lands in the customer dashboard.
 */
definePageMeta({ layout: false })

const route = useRoute()
const api = useApi()
const session = useSession()
const tenantId = useActiveTenantId()

const error = ref('')
const status = ref('Signing in as customer…')

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  const nextTenant = typeof route.query.tenantId === 'string' ? route.query.tenantId : undefined
  if (!token) {
    error.value = 'Missing impersonation token.'
    return
  }

  try {
    const context = await api.post<Awaited<ReturnType<typeof loadSession>>>('/api/v1/auth/claim-impersonation', {
      token,
      ...(nextTenant ? { tenantId: nextTenant } : {}),
    })
    if (!context) throw new Error('No session returned.')
    session.value = context
    if (nextTenant) tenantId.value = nextTenant
    else if (context.activeTenantId) tenantId.value = context.activeTenantId
    status.value = 'Redirecting…'
    await navigateTo('/')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not start impersonation.'
  }
})
</script>

<template>
  <div class="grid min-h-screen place-items-center bg-sunken px-4">
    <div class="w-full max-w-md rounded-2xl border border-line bg-raised p-6 text-center shadow-sm">
      <p v-if="error" class="text-[0.875rem] text-danger" role="alert">{{ error }}</p>
      <p v-else class="text-[0.875rem] text-soft">{{ status }}</p>
      <NuxtLink v-if="error" to="/login" class="mt-4 inline-block text-[0.8125rem] text-ink underline">
        Back to login
      </NuxtLink>
    </div>
  </div>
</template>
