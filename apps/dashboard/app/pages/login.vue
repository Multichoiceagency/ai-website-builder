<script setup lang="ts">
import { ref } from 'vue'

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
            organizationName: organizationName.value,
          }

    const context = await api.post<typeof session.value>(path, body)
    session.value = context
    tenantId.value = context?.activeTenantId ?? null

    await navigateTo((route.query.redirect as string) || '/')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Something went wrong.'
  } finally {
    busy.value = false
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
              ? 'Manage your website, content and growth in one place.'
              : 'One account, one workspace. You can add more later.'
          }}
        </p>
      </div>

      <UiCard>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <template v-if="mode === 'register'">
            <UiField v-slot="{ id }" label="Your name" required>
              <UiInput :id="id" v-model="name" autocomplete="name" placeholder="Jane de Vries" />
            </UiField>
            <UiField v-slot="{ id }" label="Company name" required>
              <UiInput :id="id" v-model="organizationName" autocomplete="organization" placeholder="Acme BV" />
            </UiField>
          </template>

          <UiField v-slot="{ id }" label="E-mail" required>
            <UiInput :id="id" v-model="email" type="email" autocomplete="email" placeholder="you@company.com" />
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

          <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
            {{ error }}
          </p>

          <UiButton type="submit" variant="primary" size="lg" :loading="busy" arrow>
            {{ mode === 'login' ? 'Sign in' : 'Create workspace' }}
          </UiButton>
        </form>
      </UiCard>

      <p class="mt-5 text-center text-[0.8125rem] text-soft">
        {{ mode === 'login' ? 'No account yet?' : 'Already have an account?' }}
        <button
          type="button"
          class="font-semibold text-brand hover:underline"
          @click="mode = mode === 'login' ? 'register' : 'login'"
        >
          {{ mode === 'login' ? 'Create one' : 'Sign in' }}
        </button>
      </p>
    </div>
  </div>
</template>
