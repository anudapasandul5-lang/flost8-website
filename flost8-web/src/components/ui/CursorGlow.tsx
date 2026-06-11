import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { createAnimatable } from 'animejs'

/**
 * Page-wide purple hue that eases toward the cursor across every section.
 * Fixed, pointer-events-none, screen-blended over the dark base. Pointer-fine
 * + non-reduced-motion only (renders nothing / stays invisible otherwise).
 */
export default function CursorGlow() {
  const shouldReduce = useReducedMotion()
  const blobRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (shouldReduce) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    const blob = blobRef.current
    if (!blob) return

    blob.style.opacity = '0.55'
    const movable = createAnimatable(blob, { x: 0, y: 0, duration: 600, ease: 'out(3)' })
    const onMove = (e: MouseEvent) => {
      movable.x(e.clientX)
      movable.y(e.clientY)
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      movable.revert()
      blob.style.opacity = '0'
    }
  }, [shouldReduce])

  if (shouldReduce) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[20] overflow-hidden">
      <div
        ref={blobRef}
        className="absolute left-0 top-0 h-[600px] w-[600px] rounded-full opacity-0 blur-[80px] transition-opacity duration-700 will-change-transform"
        style={{
          marginLeft: '-300px',
          marginTop: '-300px',
          background: 'radial-gradient(circle, rgba(157,20,255,0.45), transparent 60%)',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  )
}
