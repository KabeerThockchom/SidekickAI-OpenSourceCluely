import { useState } from 'react'
import type { Question, QuestionCategory, QuestionStatus } from '../types'

interface QuestionCardProps {
  question: Question
  onAnswer: (question: Question) => void
  onDiscovery: (question: Question) => void
  onDefer: (question: Question) => void
  onDismiss: (question: Question) => void
  isLoading?: boolean
}

const categoryColors: Record<QuestionCategory, string> = {
  technical: 'bg-blue-100 text-blue-700',
  pricing: 'bg-green-100 text-green-700',
  timeline: 'bg-purple-100 text-purple-700',
  integration: 'bg-cyan-100 text-cyan-700',
  comparison: 'bg-orange-100 text-orange-700',
  process: 'bg-gray-100 text-gray-700',
  security: 'bg-red-100 text-red-700',
  support: 'bg-yellow-100 text-yellow-700',
  use_case: 'bg-indigo-100 text-indigo-700',
  clarification: 'bg-gray-100 text-gray-600'
}

const statusIndicators: Record<QuestionStatus, { color: string; label: string }> = {
  pending: { color: 'bg-red-500', label: 'NEW' },
  answered: { color: 'bg-green-500', label: 'ANSWERED' },
  deferred: { color: 'bg-yellow-500', label: 'DEFERRED' },
  dismissed: { color: 'bg-gray-400', label: 'DISMISSED' }
}

function getTimeSince(timestamp: string): string {
  const now = new Date()
  const questionTime = new Date()
  const [hours, minutes, seconds] = timestamp.split(':').map(Number)
  questionTime.setHours(hours, minutes, seconds)

  const diffMs = now.getTime() - questionTime.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  return `${Math.floor(diffMins / 60)}h ago`
}

export function QuestionCard({
  question,
  onAnswer,
  onDiscovery,
  onDefer,
  onDismiss,
  isLoading = false
}: QuestionCardProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null)

  const status = question.status || 'pending'
  const category = question.category || 'clarification'
  const statusInfo = statusIndicators[status]
  const categoryColor = categoryColors[category]

  const isActionable = status === 'pending'

  return (
    <div className={`bg-white border rounded-lg overflow-hidden transition-all ${
      isLoading ? 'opacity-70 scale-[0.98]' : ''
    } ${status === 'dismissed' ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
          <span className="text-xs font-medium text-gray-500">{statusInfo.label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor}`}>
            {category.toUpperCase().replace('_', ' ')}
          </span>
          <span>{getTimeSince(question.timestamp)}</span>
        </div>
      </div>

      {/* Question Content */}
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900 leading-relaxed">
          "{question.question}"
        </p>
        {question.contextSummary && (
          <p className="mt-2 text-xs text-gray-500 italic">
            Context: {question.contextSummary}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {isActionable && (
        <div className="px-4 py-2 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => onAnswer(question)}
            onMouseEnter={() => setHoveredAction('answer')}
            onMouseLeave={() => setHoveredAction(null)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Answer
          </button>
          <button
            onClick={() => onDiscovery(question)}
            onMouseEnter={() => setHoveredAction('discovery')}
            onMouseLeave={() => setHoveredAction(null)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Discovery Qs
          </button>
          <button
            onClick={() => onDefer(question)}
            onMouseEnter={() => setHoveredAction('defer')}
            onMouseLeave={() => setHoveredAction(null)}
            disabled={isLoading}
            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => onDismiss(question)}
            onMouseEnter={() => setHoveredAction('dismiss')}
            onMouseLeave={() => setHoveredAction(null)}
            disabled={isLoading}
            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-400 text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tooltip */}
      {hoveredAction && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400">
            {hoveredAction === 'answer' && 'Get a direct answer to share with the customer'}
            {hoveredAction === 'discovery' && 'Get follow-up questions to dig deeper'}
            {hoveredAction === 'defer' && 'Address this question later in the call'}
            {hoveredAction === 'dismiss' && 'Not relevant or already addressed'}
          </p>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          <span className="text-xs text-gray-500">Generating response...</span>
        </div>
      )}
    </div>
  )
}
