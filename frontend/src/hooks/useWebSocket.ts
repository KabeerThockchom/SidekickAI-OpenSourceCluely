import { useEffect, useState, useCallback, useRef } from 'react'
import type { Transcript, Question, Answer, WebSocketMessage, ConnectionStatus } from '../types'

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
        console.log('✅ WebSocket connected')
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

          if (data.type === 'transcript' && data.text && data.timestamp) {
            const transcript: Transcript = {
              text: data.text,
              timestamp: data.timestamp,
              confidence: data.confidence,
              id: `${data.timestamp}-${Date.now()}`
            }
            setTranscripts(prev => [transcript, ...prev].slice(0, MAX_TRANSCRIPTS))
          }
          else if (data.type === 'question' && data.question && data.timestamp) {
            const question: Question = {
              question: data.question,
              timestamp: data.timestamp,
              context: data.context || '',
              id: `${data.timestamp}-${Date.now()}`
            }
            setQuestions(prev => [question, ...prev].slice(0, MAX_QUESTIONS))
          }
          else if (data.type === 'answer' && data.question && data.answer && data.timestamp) {
            const answer: Answer = {
              question: data.question,
              answer: data.answer,
              timestamp: data.timestamp,
              id: `${data.timestamp}-${Date.now()}`
            }
            setAnswers(prev => [answer, ...prev].slice(0, MAX_ANSWERS))
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setConnectionStatus(prev => ({ ...prev, isConnected: false }))
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket closed')
        setConnectionStatus(prev => ({ ...prev, isConnected: false }))
        wsRef.current = null

        // Attempt reconnection
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          console.log(`🔄 Reconnecting... (Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`)

          setConnectionStatus(prev => ({
            ...prev,
            reconnectAttempts: reconnectAttemptsRef.current
          }))

          reconnectTimeoutRef.current = window.setTimeout(connect, RECONNECT_DELAY)
        } else {
          console.log('❌ Max reconnection attempts reached')
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error)
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

  const answerQuestion = useCallback(async (question: string, context: string) => {
    try {
      const response = await fetch('/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, context })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Answer received:', data.answer)
      return data.answer
    } catch (error) {
      console.error('❌ Error getting answer:', error)
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
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current !== undefined) {
      window.clearTimeout(reconnectTimeoutRef.current)
    }

    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0

    // Attempt new connection
    connect()
  }, [connect])

  return {
    transcripts,
    questions,
    answers,
    connectionStatus,
    answerQuestion,
    clearTranscripts,
    clearQuestions,
    clearAnswers,
    reconnect
  }
}
