/**
 * Host page → Motionsites island content bridge.
 *
 * Animated islands (video, spotlight, GSAP) keep their own media. The CMS only
 * overrides overlay copy / fonts via postMessage — never by rewriting source.
 */

export type MotionsitesHostProps = {
  headline?: string
  headlineLine2?: string
  bodyLeft?: string
  bodyRight?: string
  ctaLabel?: string
  fontDisplay?: string
  fontBody?: string
}

type Listener = (props: MotionsitesHostProps) => void

const listeners = new Set<Listener>()
let latest: MotionsitesHostProps = {}

function isHostPropsMessage(
  data: unknown,
): data is { type: string; sectionId?: string; props?: MotionsitesHostProps } {
  return Boolean(data && typeof data === 'object' && (data as { type?: string }).type === 'motionsites-island-props')
}

function onWindowMessage(event: MessageEvent) {
  if (!isHostPropsMessage(event.data)) return
  latest = event.data.props ?? {}
  for (const listener of listeners) listener(latest)
}

let wired = false

function ensureWired(sectionId: string) {
  if (wired || typeof window === 'undefined') return
  wired = true
  window.addEventListener('message', onWindowMessage)
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'motionsites-island-ready', sectionId }, '*')
  }
}

/** Subscribe to CMS overlay props. Returns the latest snapshot + an unsubscribe. */
export function listenHostProps(
  sectionId: string,
  listener: Listener,
): { initial: MotionsitesHostProps; unsubscribe: () => void } {
  ensureWired(sectionId)
  listeners.add(listener)
  listener(latest)
  return {
    initial: latest,
    unsubscribe: () => {
      listeners.delete(listener)
    },
  }
}

export function getHostProps(): MotionsitesHostProps {
  return latest
}
