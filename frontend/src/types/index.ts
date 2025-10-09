export interface Transcript {
  text: string
  timestamp: string
  confidence?: number
  source?: 'user' | 'system'  // "user" for microphone, "system" for system audio
  id?: string
}

export interface Question {
  question: string
  timestamp: string
  context: string
  id?: string
}

export interface Answer {
  question: string
  answer: string
  timestamp: string
  id?: string
}

export interface WebSocketMessage {
  type: 'transcript' | 'question' | 'answer' | 'status'
  text?: string
  timestamp?: string
  confidence?: number
  source?: 'user' | 'system'
  question?: string
  context?: string
  answer?: string
  status?: string
}

export interface ConnectionStatus {
  isConnected: boolean
  reconnectAttempts: number
  lastConnected?: Date
}
