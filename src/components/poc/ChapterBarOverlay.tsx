import { useEffect, useRef, useState } from "react";





type Chapter = {
  number: number
  position: { x: number; y: number; width: number; height: number }
}

/**
 * Chapter Bar Overlay - POC
 * Detects YouTube chapter hover and shows chapter number overlay.
 */
export const ChapterBarOverlay = () => {
  const [hoveredChapter, setHoveredChapter] = useState<Chapter | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 })
  const lastHoveredElRef = useRef<HTMLElement | null>(null)
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const xpath =
      "//div[contains(@class,'ytp-chapter-hover-container') and contains(@class,'ytp-exp-chapter-hover-container')]"

    const observed = new WeakSet<HTMLElement>()
    const chapterNumbers = new WeakMap<HTMLElement, number>()

    const attachChapters = () => {
      const snap = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      )
      for (let i = 0; i < snap.snapshotLength; i++) {
        const el = snap.snapshotItem(i) as HTMLElement | null
        if (!el || observed.has(el)) continue
        observed.add(el)
        chapterNumbers.set(el, i + 1)
      }
      return snap.snapshotLength > 0
    }

    let attempts = 0
    const interval = setInterval(() => {
      if (attachChapters() || ++attempts >= 100) clearInterval(interval)
    }, 100)

    const findChapterEl = (x: number, y: number) =>
      (
        document
          .elementsFromPoint(x, y)
          .find(
            (el) =>
              el instanceof HTMLElement &&
              (el.classList.contains("ytp-chapter-hover-container") ||
                !!el.closest(".ytp-chapter-hover-container"))
          ) as HTMLElement | undefined
      )?.closest?.(".ytp-chapter-hover-container") as HTMLElement | null

    const onPointerMove = (e: MouseEvent) => {
      const matched = findChapterEl(e.clientX, e.clientY)

      if (!matched) {
        if (lastHoveredElRef.current) {
          lastHoveredElRef.current = null
          setHoveredChapter(null)
        }
        return
      }

      if (matched === lastHoveredElRef.current) return

      const number = chapterNumbers.get(matched)
      if (!number) return

      lastHoveredElRef.current = matched
      const { x, y, width, height } = matched.getBoundingClientRect()
      setHoveredChapter({ number, position: { x, y, width, height } })
    }

    document.addEventListener("mousemove", onPointerMove, { passive: true })
    return () => {
      clearInterval(interval)
      document.removeEventListener("mousemove", onPointerMove)
    }
  }, [])

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!isDraggingRef.current) return
      setPanelPosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y
      })
    }

    const handleUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
    }

    document.addEventListener("pointermove", handleMove)
    document.addEventListener("pointerup", handleUp)

    return () => {
      document.removeEventListener("pointermove", handleMove)
      document.removeEventListener("pointerup", handleUp)
    }
  }, [])

  if (!hoveredChapter && !panelOpen) return null

  const { x, y, width } = hoveredChapter?.position ?? {
    x: 0,
    y: 0,
    width: 0
  }
  const stop = (event: any) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent?.stopImmediatePropagation?.()
  }

  return (
    <>
      {hoveredChapter ? (
        <div
          className="bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg text-sm"
          onPointerDown={stop}
          onClick={(event) => {
            stop(event)
            if (!panelOpen) {
              setPanelOpen(true)
              const panelWidth = 320 // match your w-? size (e.g. w-80 = 320px)
              const panelHeight = 200 // set an approximate height, or measure later
              setPanelPosition({
                x: Math.round(window.innerWidth / 2 - panelWidth / 2),
                y: Math.round(window.innerHeight / 2 - panelHeight / 2)
              })

            }
          }}
          style={{
            position: "fixed",
            left: x + width / 2,
            top: y - 30,
            transform: "translateX(-50%)",
            zIndex: 10001,
            pointerEvents: "auto"
          }}>
          Chapter {hoveredChapter.number} hovered
        </div>
      ) : null}

      {panelOpen ? (
        <div
          className="bg-white border border-gray-200 rounded-xl shadow-xl w-[600px] h-[600px] text-sm resize overflow-
  auto"
          style={{
            position: "fixed",
            left: panelPosition.x,
            top: panelPosition.y,
            zIndex: 10002,
            pointerEvents: "auto"
          }}>
          <div
            className="px-3 py-2 bg-gray-100 rounded-t-xl flex items-center justify-between cursor-move select-none"
            onPointerDown={(event) => {
              event.preventDefault()
              isDraggingRef.current = true
              dragOffsetRef.current = {
                x: event.clientX - panelPosition.x,
                y: event.clientY - panelPosition.y
              }
            }}>
            <span className="font-medium">Chapter Tools</span>
            <button
              type="button"
              className="text-gray-500 hover:text-gray-800"
              onClick={() => setPanelOpen(false)}
              aria-label="Close panel">
              ×
            </button>
          </div>
          <div className="p-3">
            <div className="font-medium text-gray-900">
              Chapter {hoveredChapter?.number ?? "-"}
            </div>
            <div className="text-gray-600">
              Custom panel content goes here.
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}