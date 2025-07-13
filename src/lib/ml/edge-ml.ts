import { BehaviorEvent, UserProfile } from '@/types'

export interface EdgeMLFeatures {
  mouseMovements: number
  clickPatterns: number
  typingSpeed: number
  hesitationTime: number
  errorRate: number
  deviceType: number // encoded: mobile=1, tablet=0.5, desktop=0
  timeOfDay: number
  sessionDuration: number
  formCompletionTime: number
  scrollBehavior: number
}

export interface EdgeMLPrediction {
  userType: 'struggling' | 'fast' | 'methodical' | 'mobile' | 'accessibility'
  confidence: number
  adaptationScores: {
    fieldReordering: number
    progressiveDisclosure: number
    errorPrevention: number
    contextSwitching: number
    visualEmphasis: number
    completionGuidance: number
  }
  mlFeatures: EdgeMLFeatures // For client-side enhancement
}

/**
 * Lightweight ML inference for Edge Runtime
 * Uses simple mathematical models instead of neural networks
 * Target: <5ms inference time
 */
export class EdgeMLEngine {
  private readonly confidenceThreshold: number = 0.3
  private readonly debugging: boolean = false

  constructor(config?: { confidenceThreshold?: number; debugging?: boolean }) {
    this.confidenceThreshold = config?.confidenceThreshold || 0.3
    this.debugging = config?.debugging || false
  }

  /**
   * Extract features optimized for edge runtime
   */
  extractFeatures(events: BehaviorEvent[], userProfile?: UserProfile): EdgeMLFeatures {
    if (events.length === 0) {
      return this.getDefaultFeatures()
    }

    const mouseEvents = events.filter(e => e.eventType === 'mouse_move')
    const clickEvents = events.filter(e => e.eventType === 'mouse_click')
    const keyEvents = events.filter(e => e.eventType === 'key_press')
    const scrollEvents = events.filter(e => e.eventType === 'scroll')
    const backspaceEvents = keyEvents.filter(e => e.data.key === 'Backspace')

    // Fast calculations
    const sessionDuration = events.length > 1 ? 
      (events[events.length - 1]?.timestamp || 0) - (events[0]?.timestamp || 0) : 0

    const mouseMovements = Math.min(mouseEvents.length / 100, 1)
    const clickPatterns = Math.min(clickEvents.length / 20, 1)
    const errorRate = keyEvents.length > 0 ? backspaceEvents.length / keyEvents.length : 0
    
    // Typing speed calculation (simplified)
    const typingSpeed = keyEvents.length > 0 && sessionDuration > 0 ? 
      Math.min((keyEvents.length / (sessionDuration / 1000)) * 60 / 100, 1) : 0.5

    // Hesitation calculation (simplified)
    const hesitationTime = this.calculateHesitation(events)
    
    // Device type encoding
    const userAgent = events[0]?.userAgent || ''
    const deviceType = /mobile/i.test(userAgent) ? 1 : 
                      /tablet/i.test(userAgent) ? 0.5 : 0

    // Time of day
    const timeOfDay = new Date().getHours() / 24

    // Form completion estimate
    const formCompletionTime = sessionDuration

    // Scroll behavior
    const scrollBehavior = Math.min(scrollEvents.length / 10, 1)

    return {
      mouseMovements,
      clickPatterns,
      typingSpeed,
      hesitationTime,
      errorRate,
      deviceType,
      timeOfDay,
      sessionDuration: Math.min(sessionDuration / 300000, 1), // Normalize to 5 minutes
      formCompletionTime: Math.min(formCompletionTime / 120000, 1), // Normalize to 2 minutes
      scrollBehavior,
    }
  }

  /**
   * Lightweight ML inference using mathematical models
   * No neural networks - pure mathematical classification
   */
  predict(features: EdgeMLFeatures): EdgeMLPrediction {
    // User type classification using decision tree logic
    const userType = this.classifyUserType(features)
    const confidence = this.calculateConfidence(features, userType)
    
    // Adaptation scoring using logistic regression approximation
    const adaptationScores = this.scoreAdaptations(features, userType)

    if (this.debugging) {
      console.log('Edge ML Prediction:', {
        userType,
        confidence,
        features,
        adaptationScores
      })
    }

    return {
      userType,
      confidence,
      adaptationScores,
      mlFeatures: features
    }
  }

  /**
   * Decision tree-like user classification
   */
  private classifyUserType(features: EdgeMLFeatures): EdgeMLPrediction['userType'] {
    // Mobile detection (highest priority)
    if (features.deviceType >= 0.5) {
      return 'mobile'
    }

    // Struggling user detection
    if (features.errorRate > 0.15 || features.hesitationTime > 0.6) {
      return 'struggling'
    }

    // Fast user detection  
    if (features.typingSpeed > 0.7 && features.errorRate < 0.05 && features.hesitationTime < 0.3) {
      return 'fast'
    }

    // Accessibility user detection (high keyboard usage, low mouse usage)
    if (features.mouseMovements < 0.3 && features.typingSpeed > 0.4) {
      return 'accessibility'
    }

    // Default: methodical user
    return 'methodical'
  }

  /**
   * Calculate confidence score based on feature consistency
   */
  private calculateConfidence(features: EdgeMLFeatures, userType: string): number {
    let confidence = 0.5 // Base confidence

    switch (userType) {
      case 'struggling':
        confidence = Math.min(features.errorRate * 2 + features.hesitationTime, 1)
        break
      case 'fast':
        confidence = Math.min(features.typingSpeed + (1 - features.errorRate), 1)
        break
      case 'mobile':
        confidence = features.deviceType
        break
      case 'accessibility':
        confidence = Math.min((1 - features.mouseMovements) + features.typingSpeed / 2, 1)
        break
      case 'methodical':
        confidence = 0.6 // Medium confidence for default case
        break
    }

    return Math.max(0.1, confidence) // Minimum confidence
  }

  /**
   * Score adaptation types using simplified logistic regression
   */
  private scoreAdaptations(features: EdgeMLFeatures, userType: string): EdgeMLPrediction['adaptationScores'] {
    const scores = {
      fieldReordering: 0,
      progressiveDisclosure: 0,
      errorPrevention: 0,
      contextSwitching: 0,
      visualEmphasis: 0,
      completionGuidance: 0,
    }

    // Base scores for user types
    switch (userType) {
      case 'struggling':
        scores.errorPrevention = 0.8
        scores.contextSwitching = 0.7
        scores.completionGuidance = 0.6
        scores.progressiveDisclosure = 0.5
        break
        
      case 'fast':
        scores.fieldReordering = 0.7
        scores.progressiveDisclosure = 0.8
        scores.visualEmphasis = 0.4
        break
        
      case 'mobile':
        scores.progressiveDisclosure = 0.9
        scores.contextSwitching = 0.8
        scores.fieldReordering = 0.6
        scores.visualEmphasis = 0.7
        break
        
      case 'accessibility':
        scores.fieldReordering = 0.6
        scores.contextSwitching = 0.8
        scores.completionGuidance = 0.7
        break
        
      case 'methodical':
        scores.completionGuidance = 0.7
        scores.contextSwitching = 0.5
        scores.progressiveDisclosure = 0.4
        break
    }

    // Adjust scores based on features
    if (features.errorRate > 0.1) {
      scores.errorPrevention += 0.2
    }
    
    if (features.hesitationTime > 0.5) {
      scores.contextSwitching += 0.2
      scores.completionGuidance += 0.15
    }
    
    if (features.sessionDuration > 0.7) {
      scores.progressiveDisclosure += 0.15
    }

    // Normalize scores to 0-1 range
    Object.keys(scores).forEach(key => {
      scores[key as keyof typeof scores] = Math.min(scores[key as keyof typeof scores], 1)
    })

    return scores
  }

  /**
   * Calculate hesitation using simple time gap analysis
   */
  private calculateHesitation(events: BehaviorEvent[]): number {
    if (events.length < 2) return 0

    const gaps = []
    for (let i = 1; i < events.length; i++) {
      const gap = (events[i]?.timestamp || 0) - (events[i-1]?.timestamp || 0)
      if (gap > 1000) { // Only count gaps > 1 second
        gaps.push(gap)
      }
    }

    if (gaps.length === 0) return 0

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
    return Math.min(avgGap / 10000, 1) // Normalize to 10 seconds max
  }

  /**
   * Default features for empty sessions
   */
  private getDefaultFeatures(): EdgeMLFeatures {
    return {
      mouseMovements: 0.5,
      clickPatterns: 0.5,
      typingSpeed: 0.5,
      hesitationTime: 0.5,
      errorRate: 0.1,
      deviceType: 0, // Desktop default
      timeOfDay: 0.5,
      sessionDuration: 0.3,
      formCompletionTime: 0.3,
      scrollBehavior: 0.3,
    }
  }

  /**
   * Generate immediate adaptations from edge ML
   */
  generateAdaptations(prediction: EdgeMLPrediction, sessionId: string, formId: string) {
    const adaptations = []
    const timestamp = new Date().toISOString()

    // Generate adaptations based on scores
    Object.entries(prediction.adaptationScores).forEach(([type, score]) => {
      if (score >= this.confidenceThreshold) {
        adaptations.push({
          id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId,
          formId,
          adaptationType: this.mapAdaptationType(type),
          confidence: score,
          parameters: this.getAdaptationParameters(type, prediction),
          appliedAt: timestamp,
          source: 'edge_ml',
          userType: prediction.userType,
        })
      }
    })

    return adaptations
  }

  /**
   * Map internal adaptation types to external types
   */
  private mapAdaptationType(type: string): string {
    const mapping: Record<string, string> = {
      fieldReordering: 'field_reordering',
      progressiveDisclosure: 'progressive_disclosure',
      errorPrevention: 'error_prevention',
      contextSwitching: 'context_switching',
      visualEmphasis: 'visual_emphasis',
      completionGuidance: 'completion_guidance',
    }
    return mapping[type] || type
  }

  /**
   * Get adaptation parameters based on user type and features
   */
  private getAdaptationParameters(type: string, prediction: EdgeMLPrediction) {
    const { userType, mlFeatures } = prediction

    switch (type) {
      case 'progressiveDisclosure':
        return {
          initialFields: userType === 'mobile' ? 2 : userType === 'fast' ? 4 : 3,
          strategy: userType === 'fast' ? 'efficiency' : 'step_by_step',
          enhanceWithClientML: true,
        }
        
      case 'errorPrevention':
        return {
          enableRealTimeValidation: mlFeatures.errorRate > 0.1,
          enableInputMasking: mlFeatures.typingSpeed < 0.5,
          showHelpText: userType === 'struggling',
          enhanceWithClientML: true,
        }
        
      case 'contextSwitching':
        return {
          enableTooltips: mlFeatures.hesitationTime > 0.5,
          mobileOptimized: userType === 'mobile',
          enhanceWithClientML: true,
        }
        
      default:
        return {
          enhanceWithClientML: true,
        }
    }
  }
}

export default EdgeMLEngine