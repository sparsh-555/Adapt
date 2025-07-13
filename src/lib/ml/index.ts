// Core ML exports
export { default as MLInferenceEngine } from './inference'
export { default as AdaptationGenerator } from './adaptation-generator'
export { default as BehaviorAnalyzer } from './behavior-analyzer'

// Type exports
export type {
  MLInferenceConfig,
  BehaviorFeatures,
  AdaptationPrediction,
} from './inference'

export type {
  AdaptationGeneratorConfig,
  AdaptationContext,
} from './adaptation-generator'

export type {
  BehaviorPattern,
  SessionAnalysis,
  FieldAnalysis,
} from './behavior-analyzer'

// Re-export related types from main types
export type {
  BehaviorEvent,
  FormAdaptation,
  UserProfile,
} from '@/types'

import MLInferenceEngine from './inference'
import AdaptationGenerator from './adaptation-generator'
import BehaviorAnalyzer from './behavior-analyzer'

/**
 * Main ML manager that coordinates all ML components
 */
export class AdaptMLManager {
  private inferenceEngine: MLInferenceEngine
  private adaptationGenerator: AdaptationGenerator
  private behaviorAnalyzer: BehaviorAnalyzer
  private isInitialized = false

  constructor(config: {
    modelBasePath: string
    enableGPU?: boolean
    maxAdaptationsPerSession?: number
    confidenceThreshold?: number
    debugging?: boolean
  }) {
    this.inferenceEngine = new MLInferenceEngine({
      modelBasePath: config.modelBasePath,
      enableGPU: config.enableGPU ?? false,
      confidenceThreshold: config.confidenceThreshold ?? 0.3,
      debugging: config.debugging ?? false,
    })

    this.adaptationGenerator = new AdaptationGenerator(this.inferenceEngine, {
      maxAdaptationsPerSession: config.maxAdaptationsPerSession ?? 10,
      confidenceThreshold: config.confidenceThreshold ?? 0.3,
      debugging: config.debugging ?? false,
    })

    this.behaviorAnalyzer = new BehaviorAnalyzer()
  }

  /**
   * Initialize the ML manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.inferenceEngine.initialize()
      this.isInitialized = true
    } catch (error) {
      console.warn('ML manager initialization failed, will use fallback adaptations:', error)
      // Don't throw error - allow fallback system to work
      this.isInitialized = false
    }
  }

  /**
   * Process behavior events and generate adaptations
   */
  async processSession(
    sessionId: string,
    formId: string,
    events: import('@/types').BehaviorEvent[],
    context: {
      deviceType: string
      formElements: {
        totalFields: number
        fieldTypes: string[]
        hasValidation: boolean
        layout: 'single-column' | 'multi-column' | 'grid'
      }
      currentAdaptations: import('@/types').FormAdaptation[]
      sessionStartTime: number
    },
    userProfile?: import('@/types').UserProfile
  ): Promise<{
    adaptations: import('@/types').FormAdaptation[]
    analysis: import('./behavior-analyzer').SessionAnalysis
  }> {
    if (!this.isInitialized) {
      throw new Error('ML manager not initialized')
    }

    // Analyze user behavior
    const analysis = this.behaviorAnalyzer.analyzeSession(sessionId, events, userProfile)

    // Generate adaptations based on analysis
    const adaptationContext = {
      formId,
      sessionId,
      ...(userProfile?.id && { userId: userProfile.id }),
      deviceType: context.deviceType,
      formElements: context.formElements,
      currentAdaptations: context.currentAdaptations,
      sessionStartTime: context.sessionStartTime,
    }

    const adaptations = await this.adaptationGenerator.generateAdaptations(
      events,
      adaptationContext,
      userProfile
    )

    return {
      adaptations,
      analysis,
    }
  }

  /**
   * Get behavior analysis for a session
   */
  getSessionAnalysis(sessionId: string): import('./behavior-analyzer').SessionAnalysis | null {
    return this.behaviorAnalyzer.getSessionAnalysis(sessionId)
  }

  /**
   * Get adaptation history for a session
   */
  getAdaptationHistory(sessionId: string): import('@/types').FormAdaptation[] {
    return this.adaptationGenerator.getAdaptationHistory(sessionId)
  }

  /**
   * Clear session data
   */
  clearSessionData(sessionId: string): void {
    this.behaviorAnalyzer.clearSessionData(sessionId)
    this.adaptationGenerator.clearAdaptationHistory(sessionId)
  }

  /**
   * Get ML engine status
   */
  getStatus(): {
    initialized: boolean
    mlEngine: ReturnType<MLInferenceEngine['getStatus']>
  } {
    return {
      initialized: this.isInitialized,
      mlEngine: this.inferenceEngine.getStatus(),
    }
  }

  /**
   * Dispose of ML resources
   */
  dispose(): void {
    this.inferenceEngine.dispose()
    this.isInitialized = false
  }
}

// Singleton instance for global usage
let globalMLManager: AdaptMLManager | null = null

/**
 * Get or create the global ML manager instance
 */
export function getMLManager(config?: {
  modelBasePath: string
  enableGPU?: boolean
  maxAdaptationsPerSession?: number
  confidenceThreshold?: number
  debugging?: boolean
}): AdaptMLManager {
  if (!globalMLManager) {
    if (!config) {
      throw new Error('ML manager config required for first initialization')
    }
    globalMLManager = new AdaptMLManager(config)
  }
  return globalMLManager
}

/**
 * Initialize the global ML manager
 */
export async function initializeMLManager(config: {
  modelBasePath: string
  enableGPU?: boolean
  maxAdaptationsPerSession?: number
  confidenceThreshold?: number
  debugging?: boolean
}): Promise<AdaptMLManager> {
  const manager = getMLManager(config)
  await manager.initialize()
  return manager
}

/**
 * Utility function to extract quick insights from behavior events
 */
export function getQuickInsights(
  events: import('@/types').BehaviorEvent[]
): {
  userType: 'fast' | 'careful' | 'struggling' | 'new'
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
} {
  if (events.length === 0) {
    return {
      userType: 'new',
      riskLevel: 'low',
      recommendations: ['Monitor initial interactions'],
    }
  }

  const firstEvent = events[0]
  const lastEvent = events[events.length - 1]
  if (!firstEvent || !lastEvent) {
    return {
      userType: 'new',
      riskLevel: 'low',
      recommendations: ['Insufficient data'],
    }
  }
  
  const sessionDuration = lastEvent.timestamp - firstEvent.timestamp
  const eventsPerSecond = events.length / (sessionDuration / 1000)
  
  const keyEvents = events.filter(e => e.eventType === 'key_press')
  const backspaceEvents = keyEvents.filter(e => e.data.key === 'Backspace')
  const errorRate = keyEvents.length > 0 ? backspaceEvents.length / keyEvents.length : 0

  const focusEvents = events.filter(e => e.eventType === 'focus')
  const avgFocusTime = focusEvents.length > 1 ? sessionDuration / focusEvents.length : 0

  // Determine user type
  let userType: 'fast' | 'careful' | 'struggling' | 'new' = 'new'
  
  if (eventsPerSecond > 0.5 && errorRate < 0.1) {
    userType = 'fast'
  } else if (avgFocusTime > 10000 && errorRate < 0.15) {
    userType = 'careful'
  } else if (errorRate > 0.2 || avgFocusTime > 20000) {
    userType = 'struggling'
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  
  if (errorRate > 0.3 || sessionDuration > 600000) {
    riskLevel = 'high'
  } else if (errorRate > 0.15 || sessionDuration > 300000) {
    riskLevel = 'medium'
  }

  // Generate recommendations
  const recommendations: string[] = []
  
  switch (userType) {
    case 'fast':
      recommendations.push('Minimize validation delays', 'Enable keyboard shortcuts')
      break
    case 'careful':
      recommendations.push('Provide confirmation feedback', 'Add progress indicators')
      break
    case 'struggling':
      recommendations.push('Add contextual help', 'Enable error prevention')
      break
    case 'new':
      recommendations.push('Provide guidance', 'Monitor behavior patterns')
      break
  }

  if (riskLevel === 'high') {
    recommendations.push('Immediate intervention recommended')
  }

  return { userType, riskLevel, recommendations }
}

/**
 * Utility function to validate ML configuration
 */
export function validateMLConfig(config: any): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!config.modelBasePath) {
    errors.push('modelBasePath is required')
  }

  if (config.confidenceThreshold !== undefined) {
    if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
      errors.push('confidenceThreshold must be between 0 and 1')
    }
  }

  if (config.maxAdaptationsPerSession !== undefined) {
    if (config.maxAdaptationsPerSession < 1 || config.maxAdaptationsPerSession > 50) {
      warnings.push('maxAdaptationsPerSession should be between 1 and 50')
    }
  }

  if (config.enableGPU && typeof window === 'undefined') {
    warnings.push('GPU acceleration not available in server environment')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

export default AdaptMLManager