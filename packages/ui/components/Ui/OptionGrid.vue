<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * A grid of icon tiles instead of a dropdown.
 *
 * For a small, fixed set of *visual* choices — an animation effect, a
 * breakpoint, an alignment — a dropdown hides the answer behind a click and
 * describes a picture in words. A tile grid shows all of them at once.
 *
 * ── Why this is built on native inputs ──────────────────────────────────────
 * Each tile is a `<label>` wrapping a real `<input type="radio">` (single
 * select) or `<input type="checkbox">` (multi select), visually hidden. That is
 * not a shortcut, it is the point:
 *
 *   · roving tabindex — a native radio group is one tab stop, and Tab moves
 *     past the whole group rather than through every option
 *   · arrow keys with wrap-around, in every browser, already correct
 *   · checked state exposed to assistive tech without an `aria-checked` we
 *     could forget to update
 *   · "radio button, 2 of 6" announcements, and a group name from the legend
 *   · click, tap, drag-release and label association, for free
 *
 * A grid of `<div>`s with click handlers and hand-rolled key handling is worse
 * than the `<select>` it replaced. This is the same control, shown honestly.
 * ────────────────────────────────────────────────────────────────────────────
 */
interface OptionGridItem {
  value: string
  label: string
  /** A `UiIcon` name. Unknown names render the fallback glyph, never nothing. */
  icon?: string
  /** One line under the label. Keep it to a few words — it is not help text. */
  hint?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    options: OptionGridItem[]
    /** The group's accessible name. Rendered as a `<legend>`. */
    label: string
    /** Description for the whole group, below the tiles. */
    help?: string
    /** Independent on/off tiles instead of one-of-many. */
    multiple?: boolean
    /** `sm` for editor panels (64px tiles), `md` for full-page flows (96px). */
    size?: 'sm' | 'md'
    /** Override the column count. Defaults to 3 for `sm`, 2 for `md`. */
    columns?: number
    /** Hide the legend visually but keep it for assistive tech. */
    hideLabel?: boolean
  }>(),
  { help: '', multiple: false, size: 'sm', columns: 0, hideLabel: false },
)

/**
 * `string` when single-select, `string[]` when `multiple`. One model rather
 * than two components, because everything else about the two is identical.
 */
const model = defineModel<string | string[]>({ default: '' })

const groupId = useId()
const legendId = `${groupId}-legend`
const helpId = `${groupId}-help`

const selected = computed(() => (Array.isArray(model.value) ? model.value : [model.value]))

function isChecked(value: string): boolean {
  return selected.value.includes(value)
}

function choose(option: OptionGridItem) {
  if (option.disabled) return

  if (!props.multiple) {
    model.value = option.value
    return
  }

  const current = Array.isArray(model.value) ? model.value : []
  model.value = current.includes(option.value)
    ? current.filter((entry) => entry !== option.value)
    : [...current, option.value]
}

const columnCount = computed(() => props.columns || (props.size === 'md' ? 2 : 3))

/**
 * Selected styling is bound from `model` rather than driven by `peer-checked:`.
 * `peer-*` only reaches *siblings* of the input, and the label and hint live
 * two levels down inside the tile — so a peer variant would silently do nothing
 * on exactly the elements that need it. Focus and disabled stay on `peer-*`,
 * where the target really is the input's sibling.
 */
const TILE_SIZE = {
  sm: 'min-h-16 gap-1 px-1.5 py-2',
  md: 'min-h-24 gap-1.5 px-3 py-3.5',
}

const ICON_SIZE = { sm: 'h-[1.125rem] w-[1.125rem]', md: 'h-6 w-6' }
const LABEL_TYPE = { sm: 'type-button-10', md: 'type-button' }
const HINT_TYPE = { sm: 'type-button-10', md: 'type-caption-12' }
</script>

<template>
  <fieldset class="w-full min-w-0" :role="multiple ? undefined : 'radiogroup'" :aria-labelledby="legendId">
    <legend :id="legendId" class="type-caption mb-1.5 p-0 text-soft" :class="hideLabel ? 'sr-only' : ''">
      {{ label }}
    </legend>

    <div class="grid gap-1.5" :style="{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }">
      <label
        v-for="option in options"
        :key="option.value"
        class="group/tile relative block"
        :class="option.disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
      >
        <input
          :type="multiple ? 'checkbox' : 'radio'"
          :name="multiple ? undefined : groupId"
          :value="option.value"
          :checked="isChecked(option.value)"
          :disabled="option.disabled"
          :aria-describedby="option.hint ? `${groupId}-${option.value}-hint` : help ? helpId : undefined"
          class="peer sr-only"
          @change="choose(option)"
        />

        <span
          class="flex h-full flex-col items-center justify-center rounded-lg border text-center transition-[background-color,border-color,color,transform] duration-150 peer-disabled:opacity-40 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] group-active/tile:scale-[0.98]"
          :class="[
            TILE_SIZE[size],
            isChecked(option.value)
              ? 'border-brand bg-brand-soft text-brand'
              : 'border-line bg-raised text-soft group-hover/tile:border-line-strong group-hover/tile:bg-sunken group-hover/tile:text-ink',
          ]"
        >
          <UiIcon :name="option.icon ?? 'dot'" :class="ICON_SIZE[size]" />

          <span
            class="w-full truncate"
            :class="[LABEL_TYPE[size], isChecked(option.value) ? 'text-brand' : 'text-ink']"
          >
            {{ option.label }}
          </span>

          <span
            v-if="option.hint"
            :id="`${groupId}-${option.value}-hint`"
            class="w-full truncate text-faint"
            :class="HINT_TYPE[size]"
          >
            {{ option.hint }}
          </span>
        </span>
      </label>
    </div>

    <p v-if="help" :id="helpId" class="type-caption-12 mt-2 leading-relaxed text-faint">{{ help }}</p>
  </fieldset>
</template>
