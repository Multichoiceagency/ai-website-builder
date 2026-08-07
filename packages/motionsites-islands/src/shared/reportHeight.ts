/** Tell the host iframe renderer our document height (non–full-viewport islands). */
export function reportIslandHeight(sectionId: string) {
  const send = () => {
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0,
      window.innerHeight,
    )
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: 'motionsites-island-height', sectionId, height },
        '*',
      )
    }
  }

  send()
  window.addEventListener('load', send)
  window.addEventListener('resize', send)
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(send)
    observer.observe(document.documentElement)
  }
}
