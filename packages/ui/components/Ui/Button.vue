<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from '@lucide/vue'

/**
 * The one button.
 *
 * The pairing is deliberate: a solid warm primary next to an outlined
 * secondary with a *visible* border. A secondary that is only a hover state is
 * invisible until you go looking for it, which is why the two never read as
 * equal weight here.
 *
 * Variants are semantic, not decorative — `danger` means the action destroys
 * something, not that it should be red.
 */
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
    to?: string
    /** Trailing arrow that advances on hover. For "go do the thing" actions. */
    arrow?: boolean
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    to: '',
    arrow: false,
  },
)

const VARIANTS = {
  // Solid warm primary. Label colour is the token, not `text-white`, so a
  // theme swap can retint it — and `--brand` stays dark enough that white ink
  // always clears WCAG AA at body size.
  primary: 'bg-brand text-brand-ink hover:bg-brand-hover shadow-card disabled:bg-brand/50',
  // Outlined, like the reference pairing — a real border, not a ghost.
  secondary: 'bg-raised text-ink border border-line-strong hover:border-ink/35 hover:bg-sunken',
  ghost: 'text-soft hover:bg-sunken hover:text-ink',
  danger: 'bg-danger text-brand-ink hover:brightness-110',
} as const

const SIZES = {
  sm: 'h-8 px-3 text-[0.8125rem] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-[0.9375rem] gap-2.5 rounded-xl',
} as const

const classes = computed(
  () =>
    `group inline-flex select-none items-center justify-center font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55 ${VARIANTS[props.variant]} ${SIZES[props.size]}`,
)
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="classes">
    <slot />
    <ArrowRight
      v-if="arrow"
      class="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
      :stroke-width="2.25"
      aria-hidden="true"
    />
  </NuxtLink>

  <button v-else :type="type" :disabled="disabled || loading" :class="classes" :aria-busy="loading || undefined">
    <span
      v-if="loading"
      class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <slot />
    <ArrowRight
      v-if="arrow && !loading"
      class="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
      :stroke-width="2.25"
      aria-hidden="true"
    />
  </button>
</template>
