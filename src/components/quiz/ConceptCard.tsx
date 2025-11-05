import { useState, useRef, useEffect } from "react"
import { Trash2, Edit3, ChevronDown, ChevronUp } from "lucide-react"
import type { Concept } from "./quizSchema"

interface ConceptCardProps {
  concept: Concept
  onUpdate: (id: number, updates: Partial<Omit<Concept, 'id'>>) => void
  onDelete: (id: number) => void
}

/**
 * Editable concept card component
 * Displays concept with inline editing for title and description
 * Collapsible design - collapsed by default, click to expand
 */
export function ConceptCard({ concept, onUpdate, onDelete }: ConceptCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedTitle, setEditedTitle] = useState(concept.title)
  const [editedDescription, setEditedDescription] = useState(concept.description)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  useEffect(() => {
    if (isEditingDescription && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus()
      descriptionTextareaRef.current.select()
    }
  }, [isEditingDescription])

  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle !== concept.title) {
      onUpdate(concept.id, { title: editedTitle.trim() })
    } else {
      setEditedTitle(concept.title) // Revert if empty or unchanged
    }
    setIsEditingTitle(false)
  }

  const handleDescriptionSave = () => {
    if (editedDescription.trim() && editedDescription !== concept.description) {
      onUpdate(concept.id, { description: editedDescription.trim() })
    } else {
      setEditedDescription(concept.description) // Revert if empty or unchanged
    }
    setIsEditingDescription(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setEditedTitle(concept.title)
      setIsEditingTitle(false)
    }
  }

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditedDescription(concept.description)
      setIsEditingDescription(false)
    }
    // Allow Ctrl+Enter to save
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleDescriptionSave()
    }
  }

  return (
    <div className={`
      group relative bg-white rounded-lg border transition-all duration-200 ease-in-out
      ${isExpanded
        ? 'border-gray-200 shadow-sm p-5'
        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 hover:shadow-md'
      }
    `}>
      {/* Collapsed View */}
      {!isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-3 p-4 cursor-pointer"
        >
          {/* Number Badge */}
          <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-blue-500 bg-opacity-90 text-white font-bold text-base rounded-full">
            {concept.id}
          </span>

          {/* Title */}
          <h3 className="flex-1 text-2xl font-bold text-gray-900">
            {concept.title}
          </h3>

          {/* Chevron Icon */}
          <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <>
          <div className="flex items-start gap-3 mb-4">
            {/* Number Badge */}
            <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-blue-500 bg-opacity-90 text-white font-bold text-sm rounded-full">
              {concept.id}
            </span>

            <div className="flex-1 min-w-0">
              {/* Title Section */}
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  className="w-full px-3 py-2 text-lg font-semibold text-gray-900 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Concept title..."
                />
              ) : (
                <h3 className="text-lg font-semibold text-gray-800 leading-tight">
                  {concept.title}
                </h3>
              )}
            </div>

            {/* Collapse Button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
              title="Collapse"
              aria-label="Collapse">
              <ChevronUp size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Description Section */}
          <div className="ml-11">
            {isEditingDescription ? (
              <div className="flex flex-col gap-2">
                <textarea
                  ref={descriptionTextareaRef}
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  onBlur={handleDescriptionSave}
                  onKeyDown={handleDescriptionKeyDown}
                  rows={4}
                  className="w-full px-3 py-2 text-sm text-gray-600 leading-loose border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  placeholder="Concept description..."
                />
                <div className="text-xs text-gray-500">
                  Press Ctrl+Enter to save, Esc to cancel
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 leading-loose whitespace-pre-wrap mb-4">
                {concept.description}
              </p>
            )}

            {/* Action Toolbar */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => isEditingTitle ? handleTitleSave() : setIsEditingTitle(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit title"
                aria-label="Edit title">
                <Edit3 size={14} />
                <span>Edit Title</span>
              </button>

              <button
                onClick={() => isEditingDescription ? handleDescriptionSave() : setIsEditingDescription(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit description"
                aria-label="Edit description">
                <Edit3 size={14} />
                <span>Edit Description</span>
              </button>

              <div className="flex-1"></div>

              <button
                onClick={() => onDelete(concept.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete concept"
                aria-label="Delete concept">
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
