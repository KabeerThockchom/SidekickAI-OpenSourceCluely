import { useRef, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import type { Answer, AnswerResponse, DiscoveryResponse, DiscoveryQuestion, ObjectionResponse } from '../types'

interface ResponsePanelProps {
  currentResponse: Answer | null
  isLoading: boolean
  onUseDiscoveryQuestion?: (question: DiscoveryQuestion) => void
}

export function ResponsePanel({ currentResponse, isLoading, onUseDiscoveryQuestion }: ResponsePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    if (containerRef.current && currentResponse) {
      containerRef.current.scrollTop = 0
    }
  }, [currentResponse])

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const renderAnswerResponse = (structured: AnswerResponse) => (
    <div className="space-y-4">
      {/* Speakable Answer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Direct Answer (speak this)
          </h4>
          <button
            onClick={() => copyToClipboard(structured.speakableAnswer, 'speakable')}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {copiedKey === 'speakable' ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed">{structured.speakableAnswer}</p>
      </div>

      {/* Key Points */}
      {structured.keyPoints && structured.keyPoints.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Key Points
          </h4>
          <ul className="space-y-1">
            {structured.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-500 mt-1">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technical Details */}
      {structured.technicalDetails && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Technical Detail (if they ask follow-up)
          </h4>
          <p className="text-sm text-gray-600">{structured.technicalDetails}</p>
        </div>
      )}

      {/* Anticipated Follow-ups */}
      {structured.anticipatedFollowups && structured.anticipatedFollowups.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            They might ask next
          </h4>
          <ul className="space-y-1">
            {structured.anticipatedFollowups.map((q, idx) => (
              <li key={idx} className="text-xs text-gray-500 italic">• {q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  const renderDiscoveryResponse = (structured: DiscoveryResponse) => (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
        Discovery Questions
      </div>

      {structured.questions?.map((dq, idx) => (
        <div
          key={idx}
          className={`p-3 rounded-lg border ${
            dq.recommended
              ? 'bg-purple-50 border-purple-200'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {dq.recommended && (
                  <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                    RECOMMENDED
                  </span>
                )}
                <span className="text-xs text-gray-400">#{dq.rank}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">"{dq.text}"</p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">Why:</span> {dq.why}
              </p>
              <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {dq.type.replace('_', ' ')}
              </span>
            </div>
            <button
              onClick={() => onUseDiscoveryQuestion?.(dq)}
              className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-medium rounded transition-colors"
            >
              Use This
            </button>
          </div>
        </div>
      ))}

      {structured.avoidAsking && structured.avoidAsking.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
            Avoid Asking Now
          </h4>
          <ul className="space-y-1">
            {structured.avoidAsking.map((item, idx) => (
              <li key={idx} className="text-xs text-red-600">• {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  const renderObjectionResponse = (structured: ObjectionResponse) => (
    <div className="space-y-4">
      {/* Objection Category */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
          Objection Detected:
        </span>
        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
          {structured.objectionCategory?.toUpperCase()}
        </span>
      </div>

      {/* Customer Statement */}
      <div className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3">
        "{structured.customerStatement}"
      </div>

      {/* Recommended Response */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide">
            Recommended Response
          </h4>
          <button
            onClick={() => copyToClipboard(structured.recommendedResponse, 'objection')}
            className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
          >
            {copiedKey === 'objection' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-sm text-gray-800 leading-relaxed">{structured.recommendedResponse}</p>
      </div>

      {/* Strategy */}
      {structured.strategy && (
        <div className="text-xs text-gray-600">
          <span className="font-semibold">Strategy:</span> {structured.strategy}
        </div>
      )}

      {/* Alternative Approaches */}
      {structured.alternativeApproaches && structured.alternativeApproaches.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Alternative Approaches
          </h4>
          <div className="space-y-2">
            {structured.alternativeApproaches.map((approach, idx) => (
              <div key={idx} className="bg-gray-50 rounded p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-1">{approach.name}</div>
                <p className="text-sm text-gray-600">{approach.response}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Avoid */}
      {structured.avoidDoing && structured.avoidDoing.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
            Avoid
          </h4>
          <ul className="space-y-1">
            {structured.avoidDoing.map((item, idx) => (
              <li key={idx} className="text-xs text-red-600">• {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          <p className="text-sm">Generating response...</p>
        </div>
      )
    }

    if (!currentResponse) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-4">
          <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm font-medium mb-1">Click a question to get AI-powered assistance</p>
          <p className="text-xs">
            <span className="text-blue-600">Answer</span> - Get response to give |{' '}
            <span className="text-purple-600">Discovery</span> - Get follow-up Qs
          </p>
        </div>
      )
    }

    const structured = currentResponse.structured
    const responseType = currentResponse.responseType || 'answer'

    return (
      <div className="space-y-4">
        {/* Question being answered */}
        <div className="border-b border-gray-200 pb-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            {responseType === 'answer' && 'Answer for'}
            {responseType === 'discovery' && 'Discovery questions for'}
            {responseType === 'objection' && 'Objection handling for'}
          </div>
          <p className="text-sm font-medium text-gray-700">"{currentResponse.question}"</p>
        </div>

        {/* Response Content */}
        {responseType === 'answer' && structured && renderAnswerResponse(structured as AnswerResponse)}
        {responseType === 'discovery' && structured && renderDiscoveryResponse(structured as DiscoveryResponse)}
        {responseType === 'objection' && structured && renderObjectionResponse(structured as ObjectionResponse)}

        {/* Fallback for non-structured responses */}
        {!structured && currentResponse.answer && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-800 leading-relaxed">{currentResponse.answer}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="h-[calc(100vh-280px)] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <CardTitle className="text-base">AI Response Panel</CardTitle>
        </div>
        <CardDescription>
          {currentResponse ? `${currentResponse.responseType || 'answer'} response` : 'Select a question'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div ref={containerRef} className="h-full overflow-y-auto px-6 pb-6">
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  )
}
