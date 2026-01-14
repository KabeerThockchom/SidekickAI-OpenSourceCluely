import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { Header } from './components/Header'
import { ConnectionError } from './components/ConnectionError'
import { TranscriptPanel } from './components/TranscriptPanel'
import { QuestionCard } from './components/QuestionCard'
import { ResponsePanel } from './components/ResponsePanel'
import { QuickActions } from './components/QuickActions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card'
import { LightningBoltIcon } from '@radix-ui/react-icons'
import type { Question, Answer, QuickActionType, DiscoveryQuestion } from './types'

function App() {
  const {
    transcripts,
    questions,
    answers,
    connectionStatus,
    answerQuestion,
    getDiscoveryQuestions,
    handleObjection,
    updateQuestionStatus,
    generateSummary,
    reconnect
  } = useWebSocket()

  const [loadingQuestionId, setLoadingQuestionId] = useState<string | null>(null)
  const [currentResponse, setCurrentResponse] = useState<Answer | null>(null)
  const [isQuickActionLoading, setIsQuickActionLoading] = useState(false)
  const questionsContainerRef = useRef<HTMLDivElement>(null)

  // Update current response when new answers come in
  useEffect(() => {
    if (answers.length > 0) {
      setCurrentResponse(answers[0])
      setLoadingQuestionId(null)
    }
  }, [answers])

  // Auto-scroll questions to top when new ones arrive
  useEffect(() => {
    if (questionsContainerRef.current && questions.length > 0) {
      questionsContainerRef.current.scrollTop = 0
    }
  }, [questions])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'o':
            e.preventDefault()
            handleQuickAction('objection_handler')
            break
          case 'c':
            e.preventDefault()
            handleQuickAction('competitor_intel')
            break
          case 'd':
            e.preventDefault()
            handleQuickAction('discovery_qs')
            break
          case 'r':
            e.preventDefault()
            handleQuickAction('roi_calculator')
            break
          case 's':
            e.preventDefault()
            handleQuickAction('meeting_summary')
            break
          case 'n':
            e.preventDefault()
            handleQuickAction('next_steps')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleAnswer = async (question: Question) => {
    if (loadingQuestionId) return
    setLoadingQuestionId(question.id || null)

    try {
      await answerQuestion(
        question.question,
        question.context,
        question.category,
        question.id
      )
    } catch (error) {
      console.error('Error answering question:', error)
    } finally {
      setLoadingQuestionId(null)
    }
  }

  const handleDiscovery = async (question: Question) => {
    if (loadingQuestionId) return
    setLoadingQuestionId(question.id || null)

    try {
      await getDiscoveryQuestions(question.question, question.context)
    } catch (error) {
      console.error('Error getting discovery questions:', error)
    } finally {
      setLoadingQuestionId(null)
    }
  }

  const handleDefer = async (question: Question) => {
    if (!question.id) return
    try {
      await updateQuestionStatus(question.id, 'deferred')
    } catch (error) {
      console.error('Error deferring question:', error)
    }
  }

  const handleDismiss = async (question: Question) => {
    if (!question.id) return
    try {
      await updateQuestionStatus(question.id, 'dismissed')
    } catch (error) {
      console.error('Error dismissing question:', error)
    }
  }

  const handleUseDiscoveryQuestion = (dq: DiscoveryQuestion) => {
    // Copy to clipboard
    navigator.clipboard.writeText(dq.text)
    console.log('Discovery question copied:', dq.text)
  }

  const handleQuickAction = useCallback(async (action: QuickActionType) => {
    setIsQuickActionLoading(true)

    try {
      const context = transcripts.map(t => `[${t.timestamp}] ${t.speaker?.toUpperCase() || 'THEM'}: ${t.text}`).join('\n')

      switch (action) {
        case 'meeting_summary':
          await generateSummary()
          break
        case 'objection_handler':
          // Get the last transcript as potential objection
          const lastTranscript = transcripts[0]
          if (lastTranscript) {
            await handleObjection(lastTranscript.text, context)
          }
          break
        case 'discovery_qs':
          // Generate general discovery questions based on conversation
          if (transcripts.length > 0) {
            await getDiscoveryQuestions(
              'General conversation',
              context,
              ''
            )
          }
          break
        case 'competitor_intel':
          // Check for competitor mentions in transcripts
          const competitorMentions = transcripts.filter(t =>
            t.text.toLowerCase().includes('competitor') ||
            t.text.toLowerCase().includes('alternative') ||
            t.text.toLowerCase().includes('other solution')
          )
          if (competitorMentions.length > 0) {
            await answerQuestion(
              `What are the key differentiators vs competitors mentioned in this conversation?`,
              context,
              'comparison'
            )
          }
          break
        case 'roi_calculator':
          await answerQuestion(
            'Based on the conversation, what ROI talking points should I use?',
            context,
            'pricing'
          )
          break
        case 'next_steps':
          await answerQuestion(
            'What are the recommended next steps based on this conversation?',
            context,
            'process'
          )
          break
      }
    } catch (error) {
      console.error('Error with quick action:', error)
    } finally {
      setIsQuickActionLoading(false)
    }
  }, [transcripts, generateSummary, handleObjection, getDiscoveryQuestions, answerQuestion])

  const handleStartRecording = () => {
    console.log('Recording started')
  }

  // Filter questions by status for display
  const pendingQuestions = questions.filter(q => q.status === 'pending' || !q.status)
  const answeredQuestions = questions.filter(q => q.status === 'answered')
  const deferredQuestions = questions.filter(q => q.status === 'deferred')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        status={connectionStatus}
        onReconnect={reconnect}
        onStartRecording={handleStartRecording}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <ConnectionError
          isVisible={!connectionStatus.isConnected}
          reconnectAttempts={connectionStatus.reconnectAttempts}
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Detected Questions */}
          <div className="lg:col-span-5">
            <Card className="h-[calc(100vh-200px)] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LightningBoltIcon className="w-5 h-5 text-gray-900" />
                    <CardTitle className="text-base">Detected Questions</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingQuestions.length > 0 && (
                      <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                        {pendingQuestions.length} NEW
                      </span>
                    )}
                    {answeredQuestions.length > 0 && (
                      <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        {answeredQuestions.length} answered
                      </span>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {questions.length === 0 ? 'Listening for customer questions...' : 'Click to get AI assistance'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div
                  ref={questionsContainerRef}
                  className="h-full overflow-y-auto px-4 pb-4 space-y-3"
                >
                  {questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                      <LightningBoltIcon className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm">No questions detected yet</p>
                      <p className="text-xs mt-1">Questions from customers will appear here</p>
                    </div>
                  ) : (
                    <>
                      {/* Show pending questions first */}
                      {pendingQuestions.map((question) => (
                        <QuestionCard
                          key={question.id || question.timestamp}
                          question={question}
                          onAnswer={handleAnswer}
                          onDiscovery={handleDiscovery}
                          onDefer={handleDefer}
                          onDismiss={handleDismiss}
                          isLoading={loadingQuestionId === question.id}
                        />
                      ))}

                      {/* Show deferred questions */}
                      {deferredQuestions.map((question) => (
                        <QuestionCard
                          key={question.id || question.timestamp}
                          question={question}
                          onAnswer={handleAnswer}
                          onDiscovery={handleDiscovery}
                          onDefer={handleDefer}
                          onDismiss={handleDismiss}
                          isLoading={loadingQuestionId === question.id}
                        />
                      ))}

                      {/* Show answered questions at bottom */}
                      {answeredQuestions.length > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-400 mb-2">Previously Answered</p>
                          {answeredQuestions.map((question) => (
                            <QuestionCard
                              key={question.id || question.timestamp}
                              question={question}
                              onAnswer={handleAnswer}
                              onDiscovery={handleDiscovery}
                              onDefer={handleDefer}
                              onDismiss={handleDismiss}
                              isLoading={false}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Response Panel */}
          <div className="lg:col-span-7">
            <ResponsePanel
              currentResponse={currentResponse}
              isLoading={loadingQuestionId !== null || isQuickActionLoading}
              onUseDiscoveryQuestion={handleUseDiscoveryQuestion}
            />
          </div>
        </div>

        {/* Bottom: Live Transcript */}
        <div className="mt-4">
          <TranscriptPanel transcripts={transcripts} />
        </div>

        {/* Quick Actions Bar */}
        <div className="mt-4">
          <QuickActions
            onAction={handleQuickAction}
            isLoading={isQuickActionLoading}
          />
        </div>
      </div>
    </div>
  )
}

export default App
