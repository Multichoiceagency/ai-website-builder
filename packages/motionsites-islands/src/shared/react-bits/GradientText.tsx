import type { CSSProperties, ReactNode } from 'react'

export default function GradientText({
  children,
  className = '',
  colors = ['#40ffaa', '#4079ff', '#40ffaa'],
}: {
  children: ReactNode
  className?: string
  colors?: string[]
}) {
  const style: CSSProperties = {
    backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    backgroundSize: '200% 100%',
    animation: 'rb-gradient-shift 4s ease infinite',
  }
  return (
    <>
      <style>{`@keyframes rb-gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
      <span className={className} style={style}>
        {children}
      </span>
    </>
  )
}
