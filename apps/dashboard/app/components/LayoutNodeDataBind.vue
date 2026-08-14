<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutBind, LayoutBindSource, CmsProvider } from '@platform/schemas'

/**
 * Bind a text / image / button node to CMS copy or a URL query param.
 * Page JSON stores the bind only — never the fetched payload (ADR-0003).
 */
const props = withDefaults(
  defineProps<{
    bind?: LayoutBind
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{
  update: [bind: LayoutBind | undefined]
}>()

const SOURCE_OPTIONS = [
  { value: '', label: 'Static copy' },
  { value: 'cms', label: 'CMS' },
  { value: 'url', label: 'URL parameter' },
]

const PROVIDER_OPTIONS = [
  { value: 'platform', label: 'Platform CMS' },
  { value: 'frappe', label: 'Frappe' },
  { value: 'wordpress', label: 'WordPress' },
]

const source = computed(() => props.bind?.source ?? '')

function patch(next: Partial<LayoutBind> & { source?: LayoutBindSource | '' }) {
  if (!next.source) {
    emit('update', undefined)
    return
  }
  emit('update', {
    source: next.source,
    provider: next.provider ?? props.bind?.provider ?? 'platform',
    collection: next.collection ?? props.bind?.collection,
    path: next.path ?? props.bind?.path,
    queryKey: next.queryKey ?? props.bind?.queryKey,
    slug: next.slug ?? props.bind?.slug,
  })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <UiField v-slot="{ id }" label="Data bind">
      <UiSelect
        :id="id"
        :disabled="disabled"
        :options="SOURCE_OPTIONS"
        :model-value="source"
        @update:model-value="patch({ source: ($event || undefined) as LayoutBindSource | '' })"
      />
    </UiField>

    <template v-if="bind?.source === 'cms'">
      <UiField v-slot="{ id }" label="CMS">
        <UiSelect
          :id="id"
          :disabled="disabled"
          :options="PROVIDER_OPTIONS"
          :model-value="bind.provider ?? 'platform'"
          @update:model-value="patch({ source: 'cms', provider: $event as CmsProvider })"
        />
      </UiField>
      <UiField v-slot="{ id }" label="Collection / DocType" help="Platform slug, Frappe DocType, or WP post type.">
        <UiInput
          :id="id"
          :disabled="disabled"
          :model-value="bind.collection ?? ''"
          placeholder="articles"
          @update:model-value="patch({ source: 'cms', collection: $event })"
        />
      </UiField>
      <UiField v-slot="{ id }" label="Entry slug" help="Leave empty to use ?entry= or ?slug= on the live URL.">
        <UiInput
          :id="id"
          :disabled="disabled"
          :model-value="bind.slug ?? ''"
          placeholder="hello"
          @update:model-value="patch({ source: 'cms', slug: $event || undefined })"
        />
      </UiField>
      <UiField v-slot="{ id }" label="Field path" help="Dotted path, e.g. title or body.">
        <UiInput
          :id="id"
          :disabled="disabled"
          :model-value="bind.path ?? ''"
          placeholder="title"
          @update:model-value="patch({ source: 'cms', path: $event })"
        />
      </UiField>
    </template>

    <UiField v-else-if="bind?.source === 'url'" v-slot="{ id }" label="Query key" help="Reads ?headline= from the page URL.">
      <UiInput
        :id="id"
        :disabled="disabled"
        :model-value="bind.queryKey ?? ''"
        placeholder="headline"
        @update:model-value="patch({ source: 'url', queryKey: $event })"
      />
    </UiField>
  </div>
</template>
