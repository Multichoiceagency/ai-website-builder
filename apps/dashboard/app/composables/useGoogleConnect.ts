/**
 * Start the Integration Gateway Google OAuth flow (§18).
 *
 * When Nango is configured the API returns a Connect link; otherwise the
 * legacy Google authorize URL. Callers navigate with a full browser load.
 */
export function useGoogleConnect() {
  const api = useApi()
  const busy = ref(false)
  const error = ref('')

  async function connect(redirectTo: string) {
    busy.value = true
    error.value = ''
    try {
      const result = await api.post<{ authorizeUrl: string; broker?: string }>(
        '/api/v1/integrations/google/authorize',
        { redirectTo },
      )
      if (!result.authorizeUrl) {
        error.value =
          'Google OAuth did not return an authorization URL. Check NANGO_SECRET_KEY (preferred) or GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET on the API.'
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
