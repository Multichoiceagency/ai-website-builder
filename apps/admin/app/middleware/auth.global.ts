/**
 * Keeps non-staff out of the console UI. The server enforces the same rule on
 * every request, so this is convenience, not the control.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const session = useAdminSession()
  if (session.value === null) await loadAdminSession()

  if (to.path === '/denied') return
  if (!session.value?.isPlatformAdmin) return navigateTo('/denied')
})
