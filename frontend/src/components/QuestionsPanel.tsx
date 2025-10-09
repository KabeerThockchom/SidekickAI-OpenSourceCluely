import { useRef, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { LightningBoltIcon } from '@radix-ui/react-icons'
import type { Question } from '../types'

interface QuestionsPanelProps {
  questions: Question[]
  onQuestionClick: (question: string, context: string) => Promise<void>
}

export function QuestionsPanel({ questions, onQuestionClick }: QuestionsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [clickingId, setClickingId] = useState<string | null>(null)

  useEffect(() => {
    if (containerRef.current && questions.length > 0) {
      containerRef.current.scrollTop = 0
    }
  }, [questions])

  const handleClick = async (question: Question) => {
    if (clickingId) return // Prevent double clicks

    const questionId = question.id || question.timestamp
    setClickingId(questionId)

    try {
      await onQuestionClick(question.question, question.context)
    } finally {
      window.setTimeout(() => setClickingId(null), 1000)
    }
  }

  return (
    <Card className="h-[calc(100vh-280px)] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LightningBoltIcon className="w-5 h-5 text-gray-900" />
            <CardTitle className="text-base">Questions</CardTitle>
          </div>
          {questions.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {questions.length} detected
            </span>
          )}
        </div>
        <CardDescription>{questions.length === 0 ? '0 detected' : ''}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div
          ref={containerRef}
          className="h-full overflow-y-auto px-6 pb-6 space-y-2"
        >
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <LightningBoltIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No questions detected yet</p>
            </div>
          ) : (
            questions.map((question, index) => {
              const isClicking = clickingId === (question.id || question.timestamp)

              return (
                <div
                  key={question.id || `${question.timestamp}-${index}`}
                  onClick={() => handleClick(question)}
                  className={`p-3 bg-white border border-gray-200 rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-gray-300 active:scale-[0.98] ${
                    isClicking ? 'scale-[0.98] opacity-70' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 leading-relaxed mb-2">
                    {question.question}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{question.timestamp}</span>
                    <span>•</span>
                    <span className="text-gray-700 font-medium">Click to answer</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
