// Core behavior tracking types
export interface BehaviorEvent {
  id?: string
  sessionId: string
  formId: string
  eventType: 'mouse_move' | 'mouse_click' | 'key_press' | 'scroll' | 'focus' | 'blur' | 'form_submit' | 'field_change'
  fieldName?: string
  timestamp: number
  data: Record<string, unknown>
  userAgent: string
  url: string
}

// Form adaptation types
export interface FormAdaptation {
  id?: string
  sessionId: string
  formId: string
  adaptationType: 'field_reorder' | 'progressive_disclosure' | 'context_switching' | 'error_prevention'
  config: AdaptationConfig
  appliedAt: number
  performanceImpact?: PerformanceMetrics
}

export interface AdaptationConfig {
  fieldReorder?: {
    newOrder: string[]
    priority: number
  }
  progressiveDisclosure?: {
    fieldsToReveal: string[]
    triggerConditions: string[]
  }
  contextSwitching?: {
    showFields: string[]
    hideFields: string[]
    conditions: Record<string, unknown>
  }
  errorPrevention?: {
    fieldName: string
    validationRules: ValidationRule[]
    helpText: string
  }
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'length' | 'pattern'
  value?: string | number
  message: string
}

// User profiling types
export interface UserProfile {
  id?: string
  sessionId: string
  behaviorType: 'fast_user' | 'methodical_user' | 'mobile_user' | 'desktop_user' | 'error_prone'
  confidenceScore: number
  characteristics: BehaviorCharacteristics
  updatedAt: number
}

export interface BehaviorCharacteristics {
  averageFieldFocusTime: number
  typingSpeed: number
  correctionFrequency: number
  scrollPatterns: string[]
  deviceType: 'mobile' | 'tablet' | 'desktop'
  navigationStyle: 'linear' | 'jumping' | 'searching'
  errorPatterns: string[]
  completionRate: number
}

// Performance metrics
export interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  adaptationTime: number
  totalInteractionTime: number
  completionRate: number
  abandonmentRate: number
  errorRate: number
}

// ML inference types
export interface MLPrediction {
  userType: string
  confidence: number
  suggestedAdaptations: string[]
  reasoning: string[]
}

export interface TrainingData {
  features: number[]
  labels: string[]
  metadata: Record<string, unknown>
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'behavior_event' | 'adaptation' | 'ping' | 'pong' | 'error'
  payload: BehaviorEvent | FormAdaptation | Record<string, unknown>
  timestamp: number
  sessionId: string
}

// API response types
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

export interface TrackingAPIResponse extends APIResponse {
  adaptations?: FormAdaptation[]
  userProfile?: UserProfile
}

// Configuration types
export interface AdaptConfig {
  apiUrl: string
  formSelector: string
  trackingOptions: TrackingOptions
  adaptationOptions: AdaptationOptions
  debugging: boolean
}

export interface TrackingOptions {
  trackMouse: boolean
  trackKeyboard: boolean
  trackScroll: boolean
  debounceMs: number
  batchSize: number
  enableProfiling: boolean
}

export interface AdaptationOptions {
  enableFieldReordering: boolean
  enableProgressiveDisclosure: boolean
  enableContextSwitching: boolean
  enableErrorPrevention: boolean
  confidenceThreshold: number
  maxAdaptationsPerSession: number
}

// Database schema types (for Supabase)
export interface Database {
  public: {
    Tables: {
      behavior_events: {
        Row: BehaviorEvent & { created_at: string }
        Insert: Omit<BehaviorEvent, 'id'> & { created_at?: string }
        Update: Partial<BehaviorEvent>
      }
      adaptations: {
        Row: FormAdaptation & { created_at: string }
        Insert: Omit<FormAdaptation, 'id'> & { created_at?: string }
        Update: Partial<FormAdaptation>
      }
      user_profiles: {
        Row: UserProfile & { created_at: string }
        Insert: Omit<UserProfile, 'id'> & { created_at?: string }
        Update: Partial<UserProfile>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Utility types
export type EventHandler<T = Event> = (event: T) => void | Promise<void>
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>

// Error types
export class AdaptError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AdaptError'
  }
}

// Client-side types
export interface AdaptClient {
  init(config: AdaptConfig): Promise<void>
  track(event: BehaviorEvent): Promise<void>
  apply(adaptation: FormAdaptation): Promise<void>
  destroy(): Promise<void>
}

export interface DOMAdapter {
  applyFieldReordering(adaptation: FormAdaptation): Promise<void>
  applyProgressiveDisclosure(adaptation: FormAdaptation): Promise<void>
  applyContextSwitching(adaptation: FormAdaptation): Promise<void>
  applyErrorPrevention(adaptation: FormAdaptation): Promise<void>
}