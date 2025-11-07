"use client"

import { SlidersHorizontal } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { useChapterStore } from "~stores/chapterStore"

interface ChapterSelectionHeaderProps {
  variant?: "default" | "compact" | "micro" | "auto"
}

export function ChapterSelectionHeader({
  variant = "default"
}: ChapterSelectionHeaderProps) {
  // Get state from Zustand store
  const chapters = useChapterStore((state) => state.chapters)
  const selectedChapters = useChapterStore((state) => state.selectedChapters)
  const showChapterPanel = useChapterStore((state) => state.showPanel)
  const togglePanel = useChapterStore((state) => state.togglePanel)
  const isMicroProp = variant === "micro"

  // Overflow-aware auto sizing: full -> short -> micro only if needed
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const fullMeasureRef = useRef<HTMLSpanElement | null>(null)
  const shortMeasureRef = useRef<HTMLSpanElement | null>(null)

  const [displayMode, setDisplayMode] = useState<"full" | "short" | "micro">(
    variant === "micro" ? "micro" : "full"
  )
  const displayModeRef = useRef<"full" | "short" | "micro">(
    variant === "micro" ? "micro" : "full"
  )
  useEffect(() => {
    displayModeRef.current = displayMode
  }, [displayMode])

  useEffect(() => {
    if (variant !== "auto") {
      setDisplayMode(variant === "micro" ? "micro" : "full")
      displayModeRef.current = variant === "micro" ? "micro" : "full"
      return
    }

    // Measure available label space vs label variants and pick best fit
    const measure = () => {
      const wrapper = wrapperRef.current
      const fullSpan = fullMeasureRef.current
      const shortSpan = shortMeasureRef.current
      if (!wrapper || !fullSpan || !shortSpan) return

      const containerWidth = wrapper.clientWidth // space available for label text
      const fullWidth = fullSpan.scrollWidth
      const shortWidth = shortSpan.scrollWidth
      const HYSTERESIS_PX = 12 // slack margin to prevent ping-pong

      let next: "full" | "short" | "micro" = "micro"
      if (fullWidth + HYSTERESIS_PX <= containerWidth) {
        next = "full"
      } else if (shortWidth + HYSTERESIS_PX <= containerWidth) {
        next = "short"
      } else {
        next = "micro"
      }

      if (next !== displayModeRef.current) {
        displayModeRef.current = next
        setDisplayMode(next)
      }
    }

    // Measure after paint
    const raf = requestAnimationFrame(measure)

    // Observe future resizes
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure)
    })
    if (wrapperRef.current) ro.observe(wrapperRef.current)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [variant, chapters.length, selectedChapters.length])

  const isMicro = variant === "auto" ? displayMode === "micro" : isMicroProp
  const { fullText, shortText, microText } = (() => {
    const count = `${selectedChapters.length}`
    const total = `${chapters.length}`
    return {
      fullText: `${count} of ${total} chapters selected`,
      shortText: `${count} of ${total} selected`,
      microText: `${count}/${total}`
    }
  })()
  const labelText =
    variant === "auto"
      ? displayMode === "micro"
        ? microText
        : displayMode === "short"
          ? shortText
          : fullText
      : isMicro
        ? microText
        : fullText

  const useMicroContainer = variant !== "auto" && isMicro
  const useMicroIcon = variant !== "auto" && isMicro
  const useUnifiedPalette = variant === "compact" || variant === "auto" || isMicro

  return (
    <div
      className={`${
        useUnifiedPalette
          ? showChapterPanel
            ? "min-w-0 flex items-center justify-between h-7 px-2 rounded-md border bg-gray-50 text-gray-900 border-gray-300 border-l-4 border-l-blue-600 transition-colors cursor-pointer group"
            : "min-w-0 flex items-center justify-between h-7 px-2 rounded-md border bg-white text-gray-800 border-gray-200 hover:bg-gray-50 border-l-4 border-l-blue-500 transition-colors cursor-pointer group"
          : "min-w-0 flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
      }`}
      onClick={togglePanel}
      role="button"
      aria-label="Customize context selection">
      <div
        ref={wrapperRef}
        className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden relative">
        <span
          title={`${selectedChapters.length} of ${chapters.length} chapters selected`}
          className={`${
            isMicro
              ? "text-xs"
              : variant === "compact" || variant === "auto"
                ? "text-xs"
                : "text-sm"
          } ${useUnifiedPalette ? (showChapterPanel ? "text-gray-900" : "text-gray-800") : "text-gray-600 group-hover:text-gray-700"} transition-colors whitespace-nowrap truncate`}>
          {labelText}
        </span>
        {/* Hidden measurement spans for full and short labels */}
        {variant === "auto" && (
          <>
            <span
              ref={fullMeasureRef}
              className="absolute opacity-0 pointer-events-none whitespace-nowrap">
              {fullText}
            </span>
            <span
              ref={shortMeasureRef}
              className="absolute opacity-0 pointer-events-none whitespace-nowrap">
              {shortText}
            </span>
          </>
        )}
      </div>

      <SlidersHorizontal
        className={`${
          useMicroIcon
            ? "w-3 h-3"
            : variant === "compact" || variant === "auto"
              ? "w-3.5 h-3.5"
              : "w-4 h-4"
        } transition-colors ${useUnifiedPalette ? "text-blue-600" : showChapterPanel ? "text-blue-600" : "text-gray-600 group-hover:text-gray-700"}`}
      />
    </div>
  )
}
