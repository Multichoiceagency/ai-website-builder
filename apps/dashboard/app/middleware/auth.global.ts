/**
 * Route guard. Loads the session once, then keeps unauthenticated visitors on
 * the login page. This is convenience, not security — every API call is
 * authorized server-side regardless of what the router allows.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSession()
  const isPublicRoute = to.path === '/login'

  // Do not probe `/auth/session` on the login page — a slow 401 can finish
  // *after* register/login and wipe the fresh in-memory session (race).
  if (!isPublicRoute && session.value === null) {
    await loadSession()
  }

  if (!session.value && !isPublicRoute) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (session.value && isPublicRoute) {
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : ''
    return navigateTo(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/')
  }
})
