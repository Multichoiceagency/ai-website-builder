<script setup lang="ts">
withDefaults(
  defineProps<{ heading?: string; items?: { value: string; label: string }[] }>(),
  { heading: '', items: () => [] },
)

/** Six streaks is plenty; more reads as weather rather than atmosphere. */
const METEORS = [
  { left: '8%', delay: '0s', duration: '9s' },
  { left: '24%', delay: '2.4s', duration: '11s' },
  { left: '41%', delay: '4.1s', duration: '8s' },
  { left: '58%', delay: '1.2s', duration: '12s' },
  { left: '73%', delay: '5.6s', duration: '10s' },
  { left: '89%', delay: '3.3s', duration: '9.5s' },
]
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
    <div
      class="relative isolate overflow-hidden rounded-[calc(var(--site-radius)*2.5)] bg-[var(--site-text)] px-8 py-14 lg:px-14 lg:py-16"
    >
      <span
        class="pointer-events-none absolute inset-0 opacity-40"
        style="background: radial-gradient(90% 70% at 50% 0%, var(--site-primary) 0%, transparent 65%)"
        aria-hidden="true"
      />

      <!-- Decoration only: six absolutely positioned streaks travelling on
           `translate3d`. They are `aria-hidden` and stop dead under
           `prefers-reduced-motion`, leaving a plain dark panel. -->
      <span class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span
          v-for="(meteor, index) in METEORS"
          :key="index"
          class="absolute -top-24 h-24 w-px bg-[linear-gradient(180deg,transparent,rgb(255_255_255/0.55))] [animation:meteor-fall_var(--meteor-duration)_linear_infinite] motion-reduce:animate-none motion-reduce:opacity-0"
          :style="{ left: meteor.left, animationDelay: meteor.delay, '--meteor-duration': meteor.duration }"
        />
      </span>

      <h2
        v-if="heading"
        class="relative mb-10 max-w-xl text-[clamp(1.5rem,1.1rem+1.6vw,2.25rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-surface)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>

      <dl class="relative grid gap-10" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))">
        <div v-for="item in items" :key="item.label" class="flex flex-col">
          <dd
            class="order-1 text-[clamp(2.25rem,1.6rem+2.4vw,3.5rem)] font-semibold leading-none tracking-[-0.045em] text-[var(--site-surface)] tabular-nums"
            :style="{ fontFamily: 'var(--site-font-heading)' }"
          >{{ item.value }}</dd>
          <dt class="order-2 mt-3 text-[0.875rem] font-medium text-[var(--site-surface)]/65">{{ item.label }}</dt>
        </div>
      </dl>
    </div>
  </div>
</template>

<style>
@keyframes meteor-fall {
  from { transform: translate3d(0, 0, 0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  to { transform: translate3d(-8vw, 130vh, 0); opacity: 0; }
}
</style>
