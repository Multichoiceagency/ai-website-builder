<script setup lang="ts">
const session = useAdminSession()
const config = useRuntimeConfig()
const route = useRoute()

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/tenants', label: 'Clients' },
  { to: '/users', label: 'Users' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/marketing', label: 'Marketing' },
  { to: '/activity', label: 'Activity' },
  { to: '/health', label: 'Health' },
  { to: '/access-log', label: 'Staff access' },
]

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
</script>

<template>
  <div class="min-h-screen bg-sunken">
    <!-- A visibly different chrome from the customer dashboard: staff should
         never be unsure which system they are acting in. -->
    <header class="border-b border-line bg-ink text-paper">
      <div class="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-5">
        <NuxtLink to="/" class="flex items-center gap-2 text-[0.9375rem] font-semibold no-underline">
          <span class="grid h-6 w-6 place-items-center rounded bg-paper text-[0.6875rem] font-bold text-ink">P</span>
          Platform Admin
        </NuxtLink>

        <nav class="hidden items-center gap-1 md:flex" aria-label="Admin">
          <NuxtLink
            v-for="item in NAV"
            :key="item.to"
            :to="item.to"
            class="rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium no-underline transition-colors"
            :class="isActive(item.to) ? 'bg-white/15 text-paper' : 'text-paper/70 hover:bg-white/10 hover:text-paper'"
          >{{ item.label }}</NuxtLink>
        </nav>

        <div class="ml-auto flex items-center gap-3 text-[0.75rem] text-paper/70">
          <span class="hidden sm:inline">{{ session?.user.email }}</span>
          <a :href="config.public.dashboardUrl" class="rounded-md border border-white/25 px-2.5 py-1.5 no-underline hover:bg-white/10">
            Customer dashboard
          </a>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl px-5 py-7">
      <slot />
    </main>
  </div>
</template>
