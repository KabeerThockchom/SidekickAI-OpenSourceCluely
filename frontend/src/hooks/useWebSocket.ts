import { useEffect, useState, useCallback, useRef } from 'react'
import type {
  Transcript,
  Question,
  Answer,
  WebSocketMessage,
  ConnectionStatus,
  QuestionStatus,
  ObjectionResponse
} from '../types'

const MAX_TRANSCRIPTS = 20
const MAX_QUESTIONS = 10
const MAX_ANSWERS = 10
const RECONNECT_DELAY = 3000
const MAX_RECONNECT_ATTEMPTS = 10

export function useWebSocket() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | undefined>(undefined)
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

      ws.onopen = () => {
        console.log('WebSocket connected')
        reconnectAttemptsRef.current = 0
        setConnectionStatus({
          isConnected: true,
          reconnectAttempts: 0,
          lastConnected: new Date()
        })
      }

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data)

          // Handle ping messages
          if (data.type === 'ping') return

          if (data.type === 'transcript' && data.text && data.timestamp) {
            const transcript: Transcript = {
              text: data.text,
              timestamp: data.timestamp,
              confidence: data.confidence,
              source: data.source || 'user',
              speaker: data.speaker,
              id: `${data.timestamp}-${Date.now()}`
            }
            setTranscripts(prev => [transcript, ...prev].slice(0, MAX_TRANSCRIPTS))
          }
          else if (data.type === 'question' && data.question && data.timestamp) {
            const question: Question = {
              question: data.question,
              timestamp: data.timestamp,
              context: data.context || '',
              category: data.category,
              confidence: data.questionConfidence,
              status: 'pending',
              contextSummary: data.contextSummary,
              id: (data as any).id || `${data.timestamp}-${Date.now()}`
            }
            setQuestions(prev => [question, ...prev].slice(0, MAX_QUESTIONS))
          }
          else if (data.type === 'answer' && data.question && data.timestamp) {
            const answer: Answer = {
              question: data.question,
              answer: data.answer || '',
              timestamp: data.timestamp,
              responseType: data.responseType,
              structured: data.structured,
              id: `${data.timestamp}-${Date.now()}`
            }
            setAnswers(prev => [answer, ...prev].slice(0, MAX_ANSWERS))

            // Update question status if answered
            if ((data as any).questionId) {
              setQuestions(prev =>
                prev.map(q =>
                  q.id === (data as any).questionId
                    ? { ...q, status: 'answered' as QuestionStatus }
                    : q
                )
              )
            }
          }
          else if (data.type === 'question_status') {
            const { questionId, status } = data as any
            setQuestions(prev =>
              prev.map(q =>
                q.id === questionId ? { ...q, status: status as QuestionStatus } : q
              )
            )
          }
          else if (data.type === 'objection') {
            // Handle auto-detected objections
            const objectionData = (data as any).response
            if (objectionData) {
              const answer: Answer = {
                question: (data as any).objection?.text || 'Objection detected',
                answer: objectionData.recommended_response || '',
                timestamp: new Date().toLocaleTimeString(),
                responseType: 'objection',
                structured: {
                  objectionCategory: objectionData.objection_category,
                  customerStatement: objectionData.customer_statement,
                  recommendedResponse: objectionData.recommended_response,
                  strategy: objectionData.strategy,
                  alternativeApproaches: objectionData.alternative_approaches || [],
                  avoidDoing: objectionData.avoid_doing || []
                } as ObjectionResponse,
                id: `obj-${Date.now()}`
              }
              setAnswers(prev => [answer, ...prev].slice(0, MAX_ANSWERS))
            }
          }
          else if (data.type === 'session_cleared') {
            setTranscripts([])
            setQuestions([])
            setAnswers([])
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus(prev => ({ ...prev, isConnected: false }))
      }

      ws.onclose = () => {
        console.log('WebSocket closed')
        setConnectionStatus(prev => ({ ...prev, isConnected: false }))
        wsRef.current = null

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          console.log(`Reconnecting... (Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`)

          setConnectionStatus(prev => ({
            ...prev,
            reconnectAttempts: reconnectAttemptsRef.current
          }))

          reconnectTimeoutRef.current = window.setTimeout(connect, RECONNECT_DELAY)
        } else {
          console.log('Max reconnection attempts reached')
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current !== undefined) {
        window.clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  const answerQuestion = useCallback(async (question: string, context: string, category?: string, questionId?: string) => {
    try {
      const response = await fetch('/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context, category: category || 'technical', question_id: questionId })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.answer
    } catch (error) {
      console.error('Error getting answer:', error)
      throw error
    }
  }, [])

  const getDiscoveryQuestions = useCallback(async (question: string, context: string, knownInfo?: string) => {
    try {
      const response = await fetch('/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context, known_info: knownInfo || '' })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.discovery
    } catch (error) {
      console.error('Error getting discovery questions:', error)
      throw error
    }
  }, [])

  const handleObjection = useCallback(async (objection: string, context: string) => {
    try {
      const response = await fetch('/objection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objection, context })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.response
    } catch (error) {
      console.error('Error handling objection:', error)
      throw error
    }
  }, [])

  const updateQuestionStatus = useCallback(async (questionId: string, status: QuestionStatus) => {
    try {
      const response = await fetch(`/question/${questionId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Optimistically update local state
      setQuestions(prev =>
        prev.map(q => q.id === questionId ? { ...q, status } : q)
      )

      return await response.json()
    } catch (error) {
      console.error('Error updating question status:', error)
      throw error
    }
  }, [])

  const generateSummary = useCallback(async () => {
    try {
      const response = await fetch('/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.summary
    } catch (error) {
      console.error('Error generating summary:', error)
      throw error
    }
  }, [])

  const clearSession = useCallback(async () => {
    try {
      const response = await fetch('/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setTranscripts([])
      setQuestions([])
      setAnswers([])

      return await response.json()
    } catch (error) {
      console.error('Error clearing session:', error)
      throw error
    }
  }, [])

  const clearTranscripts = useCallback(() => {
    setTranscripts([])
  }, [])

  const clearQuestions = useCallback(() => {
    setQuestions([])
  }, [])

  const clearAnswers = useCallback(() => {
    setAnswers([])
  }, [])

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (reconnectTimeoutRef.current !== undefined) {
      window.clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  return {
    transcripts,
    questions,
    answers,
    connectionStatus,
    answerQuestion,
    getDiscoveryQuestions,
    handleObjection,
    updateQuestionStatus,
    generateSummary,
    clearSession,
    clearTranscripts,
    clearQuestions,
    clearAnswers,
    reconnect
  }
}
