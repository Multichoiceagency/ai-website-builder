import { useEffect, useMemo, useState } from 'react'

export default function BlurText({
  text,
  className = '',
  delay = 40,
}: {
  text: string
  className?: string
  delay?: number
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const words = useMemo(() => text.split(' '), [text])

  return (
    <span className={className} aria-label={text}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          style={{
            display: 'inline-block',
            marginRight: '0.3em',
            filter: ready ? 'blur(0px)' : 'blur(12px)',
            opacity: ready ? 1 : 0,
            transform: ready ? 'translateY(0)' : 'translateY(12px)',
            transition: `filter 0.6s ease ${index * delay}ms, opacity 0.6s ease ${index * delay}ms, transform 0.6s ease ${index * delay}ms`,
          }}
        >
          {word}
        </span>
      ))}
    </span>
  )
}
