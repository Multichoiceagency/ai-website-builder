import type { Page, PageRole } from '@platform/schemas'

/**
 * Load or create the site-wide header/footer chrome page, then open the editor.
 */
export async function openChromeEditor(role: Extract<PageRole, 'header' | 'footer'>) {
  const api = useApi()
  const activeSiteId = useActiveSiteId()
  if (!activeSiteId.value) {
    throw new Error('Select a website first.')
  }
  const page = await api.post<Page>(`/api/v1/sites/${activeSiteId.value}/chrome/${role}`)
  await navigateTo(`/pages/${page.id}`)
  return page
}
