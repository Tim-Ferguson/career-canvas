import { useState } from 'react'
import { moveInArray } from '../lib/resume'

interface DragState {
  pointerId: number
  from: number
  over: number
  startX: number
  startY: number
  active: boolean
}

// Pixels a pointer must travel before a press becomes a drag, so clicks and double-clicks still work.
const DRAG_THRESHOLD = 4

/**
 * Pointer-based drag reordering that works for mouse, touchpad, pen, and touch.
 * `positionAt` maps a viewport point to a position in the previewed order, or null to keep the
 * current target. `order` previews the drop result so items slide into place while dragging.
 */
export function usePointerReorder(count: number, positionAt: (x: number, y: number) => number | null, onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)

  const handlers = (index: number) => ({
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      setDrag({ pointerId: event.pointerId, from: index, over: index, startX: event.clientX, startY: event.clientY, active: false })
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (!drag || drag.pointerId !== event.pointerId) return
      const active = drag.active || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD
      const over = active ? positionAt(event.clientX, event.clientY) ?? drag.over : drag.over
      if (active !== drag.active || over !== drag.over) setDrag({ ...drag, active, over })
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      if (!drag || drag.pointerId !== event.pointerId) return
      if (drag.active && drag.over !== drag.from) onMove(drag.from, drag.over)
      setDrag(null)
    },
    onPointerCancel: (event: React.PointerEvent<HTMLElement>) => {
      if (drag?.pointerId === event.pointerId) setDrag(null)
    },
  })

  const indices = Array.from({ length: count }, (_, index) => index)
  const order = drag?.active ? moveInArray(indices, drag.from, Math.min(drag.over, count - 1)) : indices
  return { order, draggingIndex: drag?.active ? drag.from : null, handlers }
}
