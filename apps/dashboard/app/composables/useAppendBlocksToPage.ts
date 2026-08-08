import { createSection } from '@platform/blocks'
import type { Page, PageSummary, Section } from '@platform/schemas'

/**
 * Append registry blocks (or a template recipe) onto an existing page, then
 * open the editor. Used by Website → Components and Website → Templates so
 * those surfaces are part of the builder, not just catalogues.
 */
export function useAppendBlocksToPage() {
  const api = useApi()
  const activeSiteId = useActiveSiteId()
  const can = useCan()

  const { data: pages, refresh: refreshPages } = useAsyncData(
    () => `append-blocks:pages:${activeSiteId.value ?? 'none'}`,
    () =>
      activeSiteId.value
        ? api.get<PageSummary[]>(`/api/v1/sites/${activeSiteId.value}/pages`)
        : Promise.resolve([] as PageSummary[]),
    { watch: [activeSiteId], default: () => [] as PageSummary[] },
  )

  const busy = ref(false)
  const error = ref('')

  async function appendSections(pageId: string, sections: Section[]): Promise<string | null> {
    if (!can('page:write')) {
      error.value = 'You need edit access to add sections to a page.'
      return null
    }
    if (!sections.length) {
      error.value = 'Nothing to add.'
      return null
    }

    busy.value = true
    error.value = ''
    try {
      const page = await api.get<Page>(`/api/v1/pages/${pageId}`)
      await api.patch(`/api/v1/pages/${pageId}`, {
        sections: [...page.sections, ...sections],
      })
      await navigateTo(`/pages/${pageId}`)
      return pageId
    } catch (caught) {
      error.value = caught instanceof ApiError ? caught.message : 'Could not add sections to that page.'
      return null
    } finally {
      busy.value = false
    }
  }

  async function appendBlockIds(pageId: string, blockIds: string[]): Promise<string | null> {
    if (!blockIds.length) {
      error.value = 'Nothing to add.'
      return null
    }

    const added: Section[] = []
    for (const id of blockIds) {
      try {
        added.push(createSection(id))
      } catch {
        // Skip ids the registry no longer has.
      }
    }
    if (!added.length) {
      error.value = 'None of those sections exist in the registry anymore.'
      return null
    }

    return appendSections(pageId, added)
  }

  /** Prefer the home page (`/`), else the first page in the list. */
  function defaultPageId(): string | null {
    const list = pages.value ?? []
    return list.find((page) => page.path === '/')?.id ?? list[0]?.id ?? null
  }

  async function appendToDefaultPage(blockIds: string[]) {
    const pageId = defaultPageId()
    if (!pageId) {
      error.value = 'Create a page first under Website → Pages.'
      return null
    }
    return appendBlockIds(pageId, blockIds)
  }

  return {
    pages,
    refreshPages,
    busy,
    error,
    appendSections,
    appendBlockIds,
    appendToDefaultPage,
    defaultPageId,
  }
}
