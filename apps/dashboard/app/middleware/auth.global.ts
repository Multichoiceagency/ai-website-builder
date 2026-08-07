/**
 * Route guard. Loads the session once, then keeps unauthenticated visitors on
 * the login page. This is convenience, not security — every API call is
 * authorized server-side regardless of what the router allows.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSession()

  if (session.value === null) {
    await loadSession()
  }

  const isPublicRoute = to.path === '/login'

  if (!session.value && !isPublicRoute) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (session.value && isPublicRoute) {
    return navigateTo('/')
  }
})
