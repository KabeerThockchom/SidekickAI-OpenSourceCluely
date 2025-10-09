import { useState } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { Header } from './components/Header'
import { ConnectionError } from './components/ConnectionError'
import { TranscriptPanel } from './components/TranscriptPanel'
import { QAChatPanel } from './components/QAChatPanel'
import { QuestionsPanel } from './components/QuestionsPanel'

interface PendingQuestion {
  question: string
  context: string
  timestamp: string
}

function App() {
  const {
    transcripts,
    questions,
    answers,
    connectionStatus,
    answerQuestion,
    reconnect
  } = useWebSocket()

  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([])

  const handleQuestionClick = async (question: string, context: string) => {
    // Add to pending questions immediately
    const pending: PendingQuestion = {
      question,
      context,
      timestamp: new Date().toLocaleTimeString()
    }
    setPendingQuestions(prev => [pending, ...prev])

    // Request answer
    await answerQuestion(question, context)

    // Remove from pending once answer is received
    // (Answer will show up via WebSocket)
    setPendingQuestions(prev => prev.filter(p => p.question !== question))
  }

  const handleStartRecording = () => {
    // This will be handled by the backend automatically when connected
    console.log('Recording started')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        status={connectionStatus}
        onReconnect={reconnect}
        onStartRecording={handleStartRecording}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ConnectionError
          isVisible={!connectionStatus.isConnected}
          reconnectAttempts={connectionStatus.reconnectAttempts}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <TranscriptPanel transcripts={transcripts} />
          </div>
          <div className="lg:col-span-1">
            <QAChatPanel answers={answers} pendingQuestions={pendingQuestions} />
          </div>
          <div className="lg:col-span-1">
            <QuestionsPanel
              questions={questions}
              onQuestionClick={handleQuestionClick}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
