import { useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ChatBubbleIcon, QuestionMarkCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons'
import type { Answer } from '../types'

interface PendingQuestion {
  question: string
  context: string
  timestamp: string
}

interface QAChatPanelProps {
  answers: Answer[]
  pendingQuestions: PendingQuestion[]
}

export function QAChatPanel({ answers, pendingQuestions }: QAChatPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && (answers.length > 0 || pendingQuestions.length > 0)) {
      containerRef.current.scrollTop = 0
    }
  }, [answers, pendingQuestions])

  return (
    <Card className="h-[calc(100vh-280px)] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ChatBubbleIcon className="w-5 h-5 text-gray-900" />
          <CardTitle className="text-base">Q&A Chat</CardTitle>
        </div>
        <CardDescription>Selected question and answer</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div
          ref={containerRef}
          className="h-full overflow-y-auto px-6 pb-6 space-y-4"
        >
          {answers.length === 0 && pendingQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <ChatBubbleIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Select a question to view Q&A</p>
            </div>
          ) : (
            <>
              {/* Pending Questions with Loading */}
              {pendingQuestions.map((pending, index) => (
                <div
                  key={`pending-${index}`}
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  {/* Question */}
                  <div className="flex items-start gap-3 mb-3">
                    <QuestionMarkCircledIcon className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-gray-900 leading-relaxed flex-1">
                      {pending.question}
                    </p>
                  </div>

                  {/* Loading Answer */}
                  <div className="flex items-center gap-3 pl-8 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">Generating answer...</span>
                  </div>
                </div>
              ))}

              {/* Answered Questions */}
              {answers.map((answer, index) => (
                <div
                  key={answer.id || `${answer.timestamp}-${index}`}
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  {/* Question */}
                  <div className="flex items-start gap-3 mb-3">
                    <QuestionMarkCircledIcon className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-gray-900 leading-relaxed flex-1">
                      {answer.question}
                    </p>
                  </div>

                  {/* Answer */}
                  <div className="flex items-start gap-3 pl-8 pt-3 border-t border-gray-100">
                    <CheckCircledIcon className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {answer.answer}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {answer.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
