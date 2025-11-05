import type { ReactNode } from "react"

interface QuizPageLayoutProps {
  children: ReactNode
}

export function QuizPageLayout({ children }: QuizPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

