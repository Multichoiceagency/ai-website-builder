import type { CSSProperties } from 'react'

export default function Aurora({
  className = '',
  colorStops = ['#3A29FF', '#FF94B4', '#FF3232'],
}: {
  className?: string
  colorStops?: string[]
}) {
  const style: CSSProperties = {
    backgroundImage: `radial-gradient(ellipse at 20% 30%, ${colorStops[0]}66, transparent 50%), radial-gradient(ellipse at 80% 20%, ${colorStops[1]}55, transparent 45%), radial-gradient(ellipse at 50% 80%, ${colorStops[2]}44, transparent 50%)`,
    filter: 'blur(28px)',
    animation: 'rb-aurora 12s ease-in-out infinite alternate',
  }
  return (
    <>
      <style>{`@keyframes rb-aurora{0%{transform:translate3d(-4%,-2%,0) scale(1)}100%{transform:translate3d(4%,3%,0) scale(1.08)}}`}</style>
      <div className={className} style={style} aria-hidden />
    </>
  )
}
