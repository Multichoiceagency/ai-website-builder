<script setup lang="ts">
import { onMounted, ref } from 'vue'

definePageMeta({ layout: 'blank' })

const route = useRoute()
const api = useApi()
const session = useSession()
const tenantId = useActiveTenantId()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const name = ref('')
const organizationName = ref('')
const error = ref('')
const busy = ref(false)
const googleBusy = ref(false)

const GOOGLE_STATUS: Record<string, string> = {
  no_account: 'No account found for that Google user. Create a workspace first.',
  email_required: 'Google did not share an e-mail address. Allow e-mail access and try again.',
  invalid_state: 'The Google sign-in link expired. Try again.',
  missing_code: 'Google did not return an authorization code. Try again.',
  exchange_failed: 'Could not finish Google sign-in. Check the OAuth client settings.',
  callback_failed: 'Google sign-in failed. Try again, or use e-mail and password.',
  access_denied: 'Google sign-in was cancelled.',
}

onMounted(() => {
  const status = typeof route.query.google === 'string' ? route.query.google : ''
  if (status && GOOGLE_STATUS[status]) {
    error.value = GOOGLE_STATUS[status]
  } else if (status) {
    error.value = `Google sign-in failed (${status}).`
  }
})

async function submit() {
  error.value = ''
  busy.value = true

  try {
    const path = mode.value === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register'
    const body =
      mode.value === 'login'
        ? { email: email.value, password: password.value }
        : {
            email: email.value,
            password: password.value,
            name: name.value,
            ...(organizationName.value.trim()
              ? { organizationName: organizationName.value.trim() }
              : {}),
          }

    const context = await api.post<typeof session.value>(path, body)
    session.value = context
    tenantId.value = context?.activeTenantId ?? null

    // Full navigation so the session cookie is applied and middleware can
    // loadSession() cleanly — client-only navigateTo kept losing the race
    // with a stale service worker / in-memory session wipe.
    const next =
      mode.value === 'register'
        ? '/website/new?mode=ai'
        : typeof route.query.redirect === 'string' &&
            route.query.redirect.startsWith('/') &&
            !route.query.redirect.startsWith('//')
          ? route.query.redirect
          : '/'
    await navigateTo(next, { external: true })
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Something went wrong.'
  } finally {
    busy.value = false
  }
}

async function continueWithGoogle() {
  error.value = ''
  googleBusy.value = true
  try {
    const redirectTo =
      mode.value === 'register'
        ? '/website/new?mode=ai'
        : typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
          ? route.query.redirect
          : '/'

    const payload: {
      mode: 'login' | 'register'
      redirectTo: string
      organizationName?: string
      displayName?: string
    } = { mode: mode.value, redirectTo }

    if (mode.value === 'register') {
      const org = organizationName.value.trim()
      const display = name.value.trim()
      if (org.length >= 2) payload.organizationName = org
      if (display.length >= 1) payload.displayName = display
    }

    const { authorizeUrl } = await api.post<{ authorizeUrl: string }>(
      '/api/v1/auth/google/start',
      payload,
    )

    // Full navigation so Google sees a real browser redirect, not a fetch follow.
    window.location.href = authorizeUrl
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not start Google sign-in.'
    googleBusy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-screen place-items-center px-5 py-12">
    <div class="w-full max-w-sm">
      <div class="mb-8">
        <div class="mb-5 h-9 w-9 rounded-lg bg-brand" aria-hidden="true" />
        <h1 class="text-title font-semibold tracking-[-0.03em] text-ink">
          {{ mode === 'login' ? 'Sign in' : 'Create your workspace' }}
        </h1>
        <p class="mt-1.5 text-sm text-soft">
          {{
            mode === 'login'
              ? 'Manage websites, commerce and growth in one place.'
              : 'One account can own multiple websites. Sign up with Google asks for Business Profile, Search Console, Analytics, Ads and Gmail so the workspace is ready — rename anytime in Settings.'
          }}
        </p>
      </div>

      <UiCard>
        <div class="flex flex-col gap-4">
          <UiButton
            type="button"
            variant="secondary"
            size="lg"
            :loading="googleBusy"
            :disabled="busy"
            class="w-full"
            @click="continueWithGoogle"
          >
            <svg
              v-if="!googleBusy"
              class="h-[1.125rem] w-[1.125rem] shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {{ mode === 'login' ? 'Continue with Google' : 'Sign up with Google' }}
          </UiButton>

          <div class="flex items-center gap-3 text-[0.75rem] uppercase tracking-wide text-soft">
            <span class="h-px flex-1 bg-border" aria-hidden="true" />
            or
            <span class="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <form class="flex flex-col gap-4" @submit.prevent="submit">
            <template v-if="mode === 'register'">
              <UiField v-slot="{ id }" label="Your name" required>
                <UiInput :id="id" v-model="name" autocomplete="name" placeholder="Jane de Vries" />
              </UiField>
              <UiField
                v-slot="{ id, describedBy }"
                label="Company name"
                help="Optional. You can rename the workspace later in Settings."
              >
                <UiInput
                  :id="id"
                  v-model="organizationName"
                  :described-by="describedBy"
                  autocomplete="organization"
                  placeholder="Acme BV"
                />
              </UiField>
            </template>

            <UiField v-slot="{ id }" label="E-mail" required>
              <UiInput
                :id="id"
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="you@company.com"
              />
            </UiField>

            <UiField
              v-slot="{ id, describedBy }"
              label="Password"
              :help="mode === 'register' ? 'At least 12 characters. Length beats symbols.' : ''"
              required
            >
              <UiInput
                :id="id"
                v-model="password"
                type="password"
                :described-by="describedBy"
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              />
            </UiField>

            <p
              v-if="error"
              class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger"
              role="alert"
            >
              {{ error }}
            </p>

            <UiButton type="submit" variant="primary" size="lg" :loading="busy" :disabled="googleBusy" arrow>
              {{ mode === 'login' ? 'Sign in' : 'Create workspace' }}
            </UiButton>
          </form>
        </div>
      </UiCard>

      <p class="mt-5 text-center text-[0.8125rem] text-soft">
        {{ mode === 'login' ? 'No account yet?' : 'Already have an account?' }}
        <button
          type="button"
          class="font-semibold text-brand hover:underline"
          @click="
            mode = mode === 'login' ? 'register' : 'login';
            error = ''
          "
        >
          {{ mode === 'login' ? 'Create one' : 'Sign in' }}
        </button>
      </p>
    </div>
  </div>
</template>
