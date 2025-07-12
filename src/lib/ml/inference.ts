import * as tf from '@tensorflow/tfjs'
import { BehaviorEvent, FormAdaptation, UserProfile } from '@/types'
import { createAdaptError } from '@/utils'

export interface MLInferenceConfig {
  modelBasePath: string
  enableGPU?: boolean
  batchSize?: number
  confidenceThreshold?: number
  debugging?: boolean
}

export interface BehaviorFeatures {
  mouseMovements: number
  clickPatterns: number
  typingSpeed: number
  hesitationTime: number
  errorRate: number
  formCompletionTime: number
  scrollBehavior: number
  fieldFocusSequence: number[]
  deviceType: string
  timeOfDay: number
  sessionDuration: number
}

export interface AdaptationPrediction {
  type: string
  confidence: number
  targetField?: string
  parameters: Record<string, any>
  explanation: string
}

/**
 * Edge-compatible ML inference engine for generating form adaptations
 */
export class MLInferenceEngine {
  private behaviorModel: tf.LayersModel | null = null
  private adaptationModel: tf.LayersModel | null = null
  private config: MLInferenceConfig
  private isInitialized = false

  constructor(config: MLInferenceConfig) {
    this.config = {
      batchSize: 32,
      confidenceThreshold: 0.3,
      enableGPU: false,
      debugging: false,
      ...config,
    }
  }

  /**
   * Initialize the ML inference engine
   */
  async initialize(): Promise<void> {
    try {
      // Check if we're in Edge Runtime environment
      const isEdgeRuntime = typeof EdgeRuntime !== 'undefined' || 
                           (typeof global !== 'undefined' && global.EdgeRuntime) ||
                           (typeof process !== 'undefined' && process.env.VERCEL_REGION)
      
      if (isEdgeRuntime) {
        // Skip TensorFlow.js initialization in Edge Runtime
        // Use rule-based fallbacks instead
        this.isInitialized = false
        if (this.config.debugging) {
          console.log('ML Inference Engine: Skipping TensorFlow.js in Edge Runtime, using rule-based fallbacks')
        }
        return
      }

      // Set TensorFlow.js backend for browser/Node environments only
      if (this.config.enableGPU && typeof window !== 'undefined') {
        await tf.setBackend('webgl')
      } else {
        await tf.setBackend('cpu')
      }

      // Load pre-trained models (in production, these would be actual model files)
      await this.loadModels()
      
      this.isInitialized = true
      
      if (this.config.debugging) {
        console.log('ML Inference Engine initialized', {
          backend: tf.getBackend(),
          memory: tf.memory(),
        })
      }

    } catch (error) {
      // Gracefully fallback to rule-based system
      this.isInitialized = false
      if (this.config.debugging) {
        console.warn('ML initialization failed, falling back to rule-based system:', error)
      }
      // Don't throw error - just use fallbacks
    }
  }

  /**
   * Load ML models (placeholder for now - would load actual trained models)
   */
  private async loadModels(): Promise<void> {
    // For Phase 1, we'll create simple rule-based models
    // In Phase 2+, these would be replaced with actual trained models
    
    // Behavior analysis model
    this.behaviorModel = this.createBehaviorModel()
    
    // Adaptation generation model  
    this.adaptationModel = this.createAdaptationModel()
    
    if (this.config.debugging) {
      console.log('ML models loaded successfully')
    }
  }

  /**
   * Create a simple behavior analysis model
   */
  private createBehaviorModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          inputShape: [11], // Number of behavior features
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
        }),
        tf.layers.dense({
          units: 3, // User difficulty levels: easy, medium, hard
          activation: 'softmax',
        }),
      ],
    })

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    })

    return model
  }

  /**
   * Create a simple adaptation generation model
   */
  private createAdaptationModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          inputShape: [14], // Behavior features + context
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu',
        }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
        }),
        tf.layers.dense({
          units: 8, // Number of adaptation types
          activation: 'softmax',
        }),
      ],
    })

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    })

    return model
  }

  /**
   * Extract features from behavior events
   */
  extractBehaviorFeatures(
    events: BehaviorEvent[],
    profile: UserProfile | null = null
  ): BehaviorFeatures {
    if (events.length === 0) {
      return this.getDefaultFeatures()
    }

    const mouseEvents = events.filter(e => e.eventType === 'mouse_move')
    const clickEvents = events.filter(e => e.eventType === 'mouse_click')
    const keyEvents = events.filter(e => e.eventType === 'key_press')
    const focusEvents = events.filter(e => e.eventType === 'focus')

    // Calculate mouse movement patterns
    const mouseMovements = this.calculateMouseMovementComplexity(mouseEvents)
    
    // Calculate click patterns
    const clickPatterns = this.calculateClickPatterns(clickEvents)
    
    // Calculate typing speed
    const typingSpeed = this.calculateTypingSpeed(keyEvents)
    
    // Calculate hesitation time
    const hesitationTime = this.calculateHesitationTime(events)
    
    // Calculate error rate (simplified)
    const errorRate = this.calculateErrorRate(events)
    
    // Calculate form completion time
    const formCompletionTime = this.calculateFormCompletionTime(events)
    
    // Calculate scroll behavior
    const scrollBehavior = this.calculateScrollBehavior(events)
    
    // Calculate field focus sequence
    const fieldFocusSequence = this.calculateFieldFocusSequence(focusEvents)
    
    // Extract device type
    const deviceType = this.extractDeviceType(events[0]?.userAgent || '')
    
    // Extract time of day
    const timeOfDay = this.extractTimeOfDay()
    
    // Calculate session duration
    const sessionDuration = this.calculateSessionDuration(events)

    return {
      mouseMovements,
      clickPatterns,
      typingSpeed,
      hesitationTime,
      errorRate,
      formCompletionTime,
      scrollBehavior,
      fieldFocusSequence,
      deviceType,
      timeOfDay,
      sessionDuration,
    }
  }

  /**
   * Generate adaptations based on behavior analysis
   */
  async generateAdaptations(
    features: BehaviorFeatures,
    formId: string,
    sessionId: string
  ): Promise<AdaptationPrediction[]> {
    if (!this.isInitialized || !this.adaptationModel) {
      throw createAdaptError(
        'ML inference engine not initialized',
        'ML_NOT_INITIALIZED'
      )
    }

    try {
      // Convert features to tensor
      const inputTensor = this.featuresToTensor(features)
      
      // Run inference
      const predictions = this.adaptationModel.predict(inputTensor) as tf.Tensor
      const predictionData = await predictions.data()
      
      // Convert predictions to adaptation suggestions
      const adaptations = this.interpretPredictions(
        Array.from(predictionData),
        features,
        formId
      )

      // Cleanup tensors
      inputTensor.dispose()
      predictions.dispose()

      // Filter by confidence threshold
      const filteredAdaptations = adaptations.filter(
        a => a.confidence >= this.config.confidenceThreshold!
      )

      if (this.config.debugging) {
        console.log('Generated adaptations:', filteredAdaptations)
      }

      return filteredAdaptations

    } catch (error) {
      throw createAdaptError(
        'Failed to generate adaptations',
        'ML_INFERENCE_ERROR',
        { error, features }
      )
    }
  }

  /**
   * Convert behavior features to tensor
   */
  private featuresToTensor(features: BehaviorFeatures): tf.Tensor {
    const deviceTypeEncoded = features.deviceType === 'mobile' ? 1 : 
                             features.deviceType === 'tablet' ? 0.5 : 0
    
    const focusSequenceLength = features.fieldFocusSequence.length
    const focusSequenceVariance = this.calculateVariance(features.fieldFocusSequence)

    const inputData = [
      features.mouseMovements,
      features.clickPatterns,
      features.typingSpeed,
      features.hesitationTime,
      features.errorRate,
      features.formCompletionTime,
      features.scrollBehavior,
      focusSequenceLength,
      focusSequenceVariance,
      deviceTypeEncoded,
      features.timeOfDay,
      features.sessionDuration,
      // Additional context features
      Math.log(features.sessionDuration + 1), // Log-transformed duration
      features.hesitationTime / features.formCompletionTime, // Hesitation ratio
    ]

    return tf.tensor2d([inputData], [1, inputData.length])
  }

  /**
   * Interpret model predictions into actionable adaptations
   */
  private interpretPredictions(
    predictions: number[],
    features: BehaviorFeatures,
    formId: string
  ): AdaptationPrediction[] {
    const adaptationTypes = [
      'field_reordering',
      'progressive_disclosure',
      'error_prevention',
      'context_switching',
      'visual_emphasis',
      'input_assistance',
      'validation_timing',
      'completion_guidance',
    ]

    const adaptations: AdaptationPrediction[] = []

    predictions.forEach((confidence, index) => {
      const adaptationType = adaptationTypes[index]
      
      if (confidence > this.config.confidenceThreshold!) {
        adaptations.push(
          this.createAdaptationPrediction(
            adaptationType,
            confidence,
            features,
            formId
          )
        )
      }
    })

    // Sort by confidence
    adaptations.sort((a, b) => b.confidence - a.confidence)

    return adaptations
  }

  /**
   * Create specific adaptation prediction
   */
  private createAdaptationPrediction(
    type: string,
    confidence: number,
    features: BehaviorFeatures,
    formId: string
  ): AdaptationPrediction {
    const baseAdaptation = {
      type,
      confidence,
      targetField: undefined,
      parameters: {},
      explanation: '',
    }

    switch (type) {
      case 'field_reordering':
        return {
          ...baseAdaptation,
          parameters: {
            priorityFields: features.fieldFocusSequence.slice(0, 3),
            strategy: features.hesitationTime > 5000 ? 'simplify' : 'optimize',
          },
          explanation: 'Reorder fields based on user focus patterns to reduce cognitive load',
        }

      case 'progressive_disclosure':
        return {
          ...baseAdaptation,
          parameters: {
            initialFields: Math.max(3, Math.floor(8 - features.hesitationTime / 1000)),
            strategy: features.deviceType === 'mobile' ? 'step_by_step' : 'grouped',
          },
          explanation: 'Show fields progressively to reduce form overwhelming',
        }

      case 'error_prevention':
        return {
          ...baseAdaptation,
          parameters: {
            enableRealTimeValidation: features.errorRate > 0.1,
            enableInputMasking: features.typingSpeed < 30,
            enableAutoComplete: true,
          },
          explanation: 'Prevent errors with real-time validation and input assistance',
        }

      case 'context_switching':
        return {
          ...baseAdaptation,
          parameters: {
            enableTooltips: features.hesitationTime > 3000,
            enableInlineHelp: features.deviceType !== 'mobile',
            enableExamples: features.errorRate > 0.05,
          },
          explanation: 'Provide contextual help to reduce user confusion',
        }

      default:
        return {
          ...baseAdaptation,
          explanation: `Apply ${type} optimization based on behavior analysis`,
        }
    }
  }

  // Helper methods for feature calculation
  private calculateMouseMovementComplexity(events: BehaviorEvent[]): number {
    if (events.length < 2) return 0
    // Simplified calculation - would be more sophisticated in production
    return Math.min(events.length / 100, 1)
  }

  private calculateClickPatterns(events: BehaviorEvent[]): number {
    return Math.min(events.length / 20, 1)
  }

  private calculateTypingSpeed(events: BehaviorEvent[]): number {
    if (events.length < 2) return 0.5
    const timeSpan = events[events.length - 1].timestamp - events[0].timestamp
    return Math.min((events.length / (timeSpan / 1000)) * 60, 100) / 100 // WPM normalized
  }

  private calculateHesitationTime(events: BehaviorEvent[]): number {
    // Calculate average time between interactions
    if (events.length < 2) return 0
    const intervals = []
    for (let i = 1; i < events.length; i++) {
      intervals.push(events[i].timestamp - events[i - 1].timestamp)
    }
    return intervals.reduce((a, b) => a + b, 0) / intervals.length
  }

  private calculateErrorRate(events: BehaviorEvent[]): number {
    // Simplified error detection
    const totalInteractions = events.length
    const errorIndicators = events.filter(e => 
      e.eventType === 'key_press' && e.data.key === 'Backspace'
    ).length
    return totalInteractions > 0 ? errorIndicators / totalInteractions : 0
  }

  private calculateFormCompletionTime(events: BehaviorEvent[]): number {
    if (events.length < 2) return 0
    return events[events.length - 1].timestamp - events[0].timestamp
  }

  private calculateScrollBehavior(events: BehaviorEvent[]): number {
    const scrollEvents = events.filter(e => e.eventType === 'scroll')
    return Math.min(scrollEvents.length / 10, 1)
  }

  private calculateFieldFocusSequence(events: BehaviorEvent[]): number[] {
    return events
      .filter(e => e.fieldName)
      .map((e, index) => index)
      .slice(0, 10) // Limit sequence length
  }

  private extractDeviceType(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return 'mobile'
    if (/tablet/i.test(userAgent)) return 'tablet'
    return 'desktop'
  }

  private extractTimeOfDay(): number {
    const hour = new Date().getHours()
    return hour / 24 // Normalize to 0-1
  }

  private calculateSessionDuration(events: BehaviorEvent[]): number {
    if (events.length < 2) return 0
    return events[events.length - 1].timestamp - events[0].timestamp
  }

  private calculateVariance(sequence: number[]): number {
    if (sequence.length < 2) return 0
    const mean = sequence.reduce((a, b) => a + b, 0) / sequence.length
    const variance = sequence.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sequence.length
    return variance
  }

  private getDefaultFeatures(): BehaviorFeatures {
    return {
      mouseMovements: 0.5,
      clickPatterns: 0.5,
      typingSpeed: 0.5,
      hesitationTime: 2000,
      errorRate: 0.1,
      formCompletionTime: 30000,
      scrollBehavior: 0.3,
      fieldFocusSequence: [0, 1, 2],
      deviceType: 'desktop',
      timeOfDay: 0.5,
      sessionDuration: 30000,
    }
  }

  /**
   * Cleanup and dispose of resources
   */
  dispose(): void {
    if (this.behaviorModel) {
      this.behaviorModel.dispose()
      this.behaviorModel = null
    }
    
    if (this.adaptationModel) {
      this.adaptationModel.dispose()
      this.adaptationModel = null
    }
    
    this.isInitialized = false
  }

  /**
   * Get engine status
   */
  getStatus(): {
    initialized: boolean
    backend: string
    memory: tf.MemoryInfo
  } {
    return {
      initialized: this.isInitialized,
      backend: tf.getBackend(),
      memory: tf.memory(),
    }
  }
}

export default MLInferenceEngine