import { useEffect, useRef, type ReactNode } from 'react'

export default function Magnet({
  children,
  className = '',
  padding = 40,
}: {
  children: ReactNode
  className?: string
  padding?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = event.clientX - (rect.left + rect.width / 2)
      const y = event.clientY - (rect.top + rect.height / 2)
      const dist = Math.hypot(x, y)
      if (dist > padding * 2) {
        el.style.transform = 'translate(0px, 0px)'
        return
      }
      el.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`
    }
    const onLeave = () => {
      el.style.transform = 'translate(0px, 0px)'
    }
    window.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [padding])

  return (
    <div ref={ref} className={className} style={{ display: 'inline-block', transition: 'transform 0.2s ease' }}>
      {children}
    </div>
  )
}
