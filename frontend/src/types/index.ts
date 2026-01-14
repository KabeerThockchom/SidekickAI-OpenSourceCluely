// Question categories for Sales Engineer Copilot
export type QuestionCategory =
  | 'technical'
  | 'pricing'
  | 'timeline'
  | 'integration'
  | 'comparison'
  | 'process'
  | 'security'
  | 'support'
  | 'use_case'
  | 'clarification'

// Question status tracking
export type QuestionStatus = 'pending' | 'answered' | 'deferred' | 'dismissed'

// Response types
export type ResponseType = 'answer' | 'discovery' | 'objection'

export interface Transcript {
  text: string
  timestamp: string
  confidence?: number
  source?: 'user' | 'system'
  speaker?: 'me' | 'them'  // Sales Engineer vs Customer
  id?: string
}

export interface Question {
  question: string
  timestamp: string
  context: string
  category?: QuestionCategory
  confidence?: number
  status?: QuestionStatus
  contextSummary?: string  // Brief summary of why this question matters
  id?: string
}

// Structured answer response
export interface AnswerResponse {
  speakableAnswer: string
  keyPoints: string[]
  technicalDetails?: string
  anticipatedFollowups?: string[]
  sources?: string[]
}

// Discovery questions response
export interface DiscoveryResponse {
  questions: DiscoveryQuestion[]
  avoidAsking?: string[]
}

export interface DiscoveryQuestion {
  rank: number
  text: string
  type: 'pain_amplification' | 'requirements_gathering' | 'decision_criteria' | 'timeline_discovery' | 'stakeholder_mapping' | 'budget_qualification' | 'competition_intel'
  why: string
  recommended?: boolean
}

// Objection handling response
export interface ObjectionResponse {
  objectionCategory: string
  customerStatement: string
  recommendedResponse: string
  strategy: string
  alternativeApproaches: AlternativeApproach[]
  avoidDoing?: string[]
}

export interface AlternativeApproach {
  name: string
  response: string
}

export interface Answer {
  question: string
  answer: string
  timestamp: string
  responseType?: ResponseType
  structured?: AnswerResponse | DiscoveryResponse | ObjectionResponse
  id?: string
}

// Customer context for personalized responses
export interface CustomerContext {
  company?: string
  industry?: string
  size?: string
  currentSolution?: string
  painPoints?: string[]
  contacts?: string[]
}

// Quick action types
export type QuickActionType =
  | 'objection_handler'
  | 'competitor_intel'
  | 'discovery_qs'
  | 'roi_calculator'
  | 'meeting_summary'
  | 'next_steps'

export interface WebSocketMessage {
  type: 'transcript' | 'question' | 'answer' | 'status' | 'objection' | 'ping' | 'question_status' | 'session_cleared' | 'summary'
  text?: string
  timestamp?: string
  confidence?: number
  source?: 'user' | 'system'
  speaker?: 'me' | 'them'
  question?: string
  context?: string
  category?: QuestionCategory
  questionConfidence?: number
  contextSummary?: string
  answer?: string
  responseType?: ResponseType
  structured?: AnswerResponse | DiscoveryResponse | ObjectionResponse
  status?: string
  // Objection detection
  objection?: {
    id: string
    text: string
    category: string
    suggestedResponse: string
  }
}

export interface ConnectionStatus {
  isConnected: boolean
  reconnectAttempts: number
  lastConnected?: Date
}

// Session state
export interface SessionState {
  isActive: boolean
  customerContext?: CustomerContext
  meetingType?: 'discovery' | 'demo' | 'technical_deep_dive' | 'negotiation'
  startedAt?: Date
}
