/**
 * Start the Integration Gateway Google OAuth flow (§18).
 *
 * Returns a URL rather than redirecting from the API, because a `fetch` would
 * follow the 302 itself and the user would never see Google's consent screen.
 * Callers navigate with a full browser load once they have the URL.
 */
export function useGoogleConnect() {
  const api = useApi()
  const busy = ref(false)
  const error = ref('')

  async function connect(redirectTo: string) {
    busy.value = true
    error.value = ''
    try {
      const result = await api.post<{ authorizeUrl: string }>('/api/v1/integrations/google/authorize', {
        redirectTo,
      })
      if (!result.authorizeUrl) {
        error.value =
          'Google OAuth did not return an authorization URL. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_OAUTH_REDIRECT_URI on the API.'
        return
      }
      window.location.href = result.authorizeUrl
    } catch (cause) {
      error.value = cause instanceof ApiError ? cause.message : 'Could not start Google connection.'
    } finally {
      busy.value = false
    }
  }

  return { busy, error, connect }
}
