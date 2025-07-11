export interface AdaptConfig {
  formId: string
  goal: 'conversion' | 'completion_time' | 'user_satisfaction'
  apiUrl?: string
  enableRealtimeAdaptations?: boolean
  enableBehaviorTracking?: boolean
  debugMode?: boolean
}

export interface BehaviorEvent {
  sessionId: string
  formId: string
  eventType: string
  fieldName?: string
  timestamp: number
  data: any
  userAgent?: string
}

export interface UserProfile {
  sessionId: string
  behaviorType?: string
  confidenceScore?: number
  characteristics?: {
    typingSpeed?: number
    errorProne?: boolean
    mobileFinger?: boolean
    speedRunner?: boolean
    fieldHesitation?: boolean
    methodical?: boolean
  }
}

export interface Adaptation {
  id: string
  type: 'field_reorder' | 'progressive_disclosure' | 'smart_validation' | 'contextual_help'
  target: string
  config: any
  confidence: number
}

export interface FormMetrics {
  totalSessions: number
  completedSessions: number
  avgCompletionTime: number
  adaptationsApplied: number
  conversionImprovement: number
}

export interface FieldInteractionMetrics {
  fieldName: string
  hoverTime: number
  focusTime: number
  typingSpeed: number
  corrections: number
  hesitation: boolean
  errorCount: number
}