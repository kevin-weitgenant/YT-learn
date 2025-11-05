import type { ReactNode } from "react"

interface CircularProgressProps {
  percentage: number // 0-100
  size?: number // diameter in pixels
  strokeWidth?: number
  children: ReactNode
}

/**
 * Circular progress indicator that wraps content
 * Displays a progress ring around the wrapped element
 */
export function CircularProgress({
  percentage,
  size = 40,
  strokeWidth = 2,
  children
}: CircularProgressProps) {
  // Ensure percentage is between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage))

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* SVG Progress Circle */}
      <svg
        className="absolute inset-0 -rotate-90 pointer-events-none"
        width={size}
        height={size}
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%) rotate(-90deg)"
        }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-gray-500 transition-all duration-300 ease-in-out"
          strokeLinecap="round"
        />
      </svg>
      
      {/* Content */}
      {children}
    </div>
  )
}

