<script setup lang="ts">
import { computed } from 'vue'

/**
 * A ranked breakdown: one bar per row, drawn as inline SVG inside a real table.
 *
 * The table is the chart, not a fallback for it. Every figure is literal text
 * in a cell, so the numbers reach a screen reader, a keyboard, and copy-paste
 * without a second implementation — the bar is the part that gets
 * `aria-hidden`, because it is the decoration, not the data.
 */

export interface ChartBarRow {
  key: string
  label: string
  /** The quantity the bar length encodes. */
  value: number
  /** Extra columns, rendered as text exactly as given. */
  extra?: { label: string; value: string }[]
  /** Optional link for the row label. */
  to?: string
}

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    valueLabel: string
    rows: ChartBarRow[]
    format?: (value: number) => string
    emptyTitle?: string
    emptyDescription?: string
    /** Rows the API had but did not return, so a truncated table says so. */
    remainingRows?: number
  }>(),
  {
    description: '',
    format: (value: number) => String(value),
    emptyTitle: 'Nothing to break down yet',
    emptyDescription: 'This table fills in as soon as events are collected.',
    remainingRows: 0,
  },
)

const max = computed(() => Math.max(1, ...props.rows.map((row) => Math.abs(row.value))))

function widthOf(value: number): number {
  return Math.max(value > 0 ? 1.5 : 0, (Math.abs(value) / max.value) * 100)
}

const columns = computed(() => props.rows[0]?.extra?.map((entry) => entry.label) ?? [])
</script>

<template>
  <section>
    <div class="mb-3">
      <h3 class="text-[0.9375rem] font-semibold text-ink">{{ title }}</h3>
      <p v-if="description" class="mt-0.5 text-[0.8125rem] text-soft">{{ description }}</p>
    </div>

    <p v-if="!rows.length" class="rounded-lg border border-dashed border-line-strong bg-sunken/40 px-4 py-8 text-center text-sm text-soft">
      <span class="block font-medium text-ink">{{ emptyTitle }}</span>
      {{ emptyDescription }}
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[30rem] border-collapse text-left text-sm">
        <caption class="sr-only">{{ title }}</caption>
        <thead>
          <tr class="border-b border-line">
            <th scope="col" class="pb-2 pr-4 text-label font-semibold uppercase text-faint">Name</th>
            <th scope="col" class="pb-2 pr-4 text-label font-semibold uppercase text-faint">{{ valueLabel }}</th>
            <th
              v-for="column in columns"
              :key="column"
              scope="col"
              class="pb-2 pr-4 text-right text-label font-semibold uppercase text-faint"
            >
              {{ column }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key" class="border-b border-line last:border-0">
            <th scope="row" class="max-w-[16rem] truncate py-2.5 pr-4 font-medium text-ink" :title="row.label">
              <NuxtLink v-if="row.to" :to="row.to" class="text-ink no-underline hover:underline">
                {{ row.label }}
              </NuxtLink>
              <template v-else>{{ row.label }}</template>
            </th>

            <td class="py-2.5 pr-4">
              <div class="flex items-center gap-2.5">
                <span class="w-16 shrink-0 tabular-nums text-ink">{{ format(row.value) }}</span>
                <svg
                  class="h-2 w-full min-w-[3rem] max-w-[14rem]"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <title>{{ row.label }}: {{ format(row.value) }}</title>
                  <rect x="0" y="1" width="100" height="6" rx="3" fill="var(--paper-sunken)" />
                  <rect x="0" y="1" :width="widthOf(row.value)" height="6" rx="3" fill="var(--brand)" />
                </svg>
              </div>
            </td>

            <td
              v-for="entry in row.extra ?? []"
              :key="entry.label"
              class="py-2.5 pr-4 text-right tabular-nums text-soft"
            >
              {{ entry.value }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="remainingRows > 0" class="mt-2 text-[0.8125rem] text-faint">
      {{ remainingRows }} more row{{ remainingRows === 1 ? '' : 's' }} not shown — this table lists the top
      {{ rows.length }}.
    </p>
  </section>
</template>
