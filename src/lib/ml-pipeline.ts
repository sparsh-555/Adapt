import * as tf from '@tensorflow/tfjs'
import { BehaviorEvent, UserProfile, Adaptation } from './types'

interface BehaviorFeatures {
  typingSpeed: number
  hoverTime: number
  correctionRate: number
  hesitationScore: number
  fieldSwitchFrequency: number
  errorRate: number
  completionTime: number
  sessionDuration: number
  deviceType: number // 0: desktop, 1: mobile, 2: tablet
  screenSize: number
  timeOfDay: number
  dayOfWeek: number
}

interface AdaptationScore {
  type: string
  confidence: number
  priority: number
  expectedImprovement: number
}

export class MLPipeline {
  private behaviorModel: tf.LayersModel | null = null
  private adaptationModel: tf.LayersModel | null = null
  private scaler: { mean: number[]; std: number[] } | null = null
  private isInitialized = false

  constructor() {
    this.init()
  }

  async init(): Promise<void> {
    try {
      // Initialize TensorFlow.js
      await tf.ready()
      
      // Load or create models
      await this.loadModels()
      
      // Initialize feature scaler
      this.initializeScaler()
      
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize ML pipeline:', error)
      // Fallback to rule-based system
      this.isInitialized = false
    }
  }

  private async loadModels(): Promise<void> {
    try {
      // Try to load pre-trained models
      this.behaviorModel = await tf.loadLayersModel('/models/behavior-classifier.json')
      this.adaptationModel = await tf.loadLayersModel('/models/adaptation-recommender.json')
    } catch (error) {
      console.log('Pre-trained models not found, creating new models')
      // Create new models if not found
      this.behaviorModel = this.createBehaviorModel()
      this.adaptationModel = this.createAdaptationModel()
    }
  }

  private createBehaviorModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [12], // 12 behavioral features
          units: 64,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.dense({
          units: 6, // 6 behavior types
          activation: 'softmax'
        })
      ]
    })

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })

    return model
  }

  private createAdaptationModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [18], // 12 behavioral features + 6 behavior type probabilities
          units: 64,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.dense({
          units: 4, // 4 adaptation types
          activation: 'sigmoid' // Multi-output classification
        })
      ]
    })

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    })

    return model
  }

  private initializeScaler(): void {
    // Initialize with reasonable defaults for feature scaling
    this.scaler = {
      mean: [
        150, // typingSpeed
        2000, // hoverTime
        0.2, // correctionRate
        0.3, // hesitationScore
        3, // fieldSwitchFrequency
        0.1, // errorRate
        30000, // completionTime
        120000, // sessionDuration
        0.5, // deviceType
        1920, // screenSize
        12, // timeOfDay
        3 // dayOfWeek
      ],
      std: [
        100, // typingSpeed
        3000, // hoverTime
        0.3, // correctionRate
        0.4, // hesitationScore
        5, // fieldSwitchFrequency
        0.2, // errorRate
        60000, // completionTime
        180000, // sessionDuration
        0.8, // deviceType
        800, // screenSize
        8, // timeOfDay
        2 // dayOfWeek
      ]
    }
  }

  async analyzeBehavior(events: BehaviorEvent[]): Promise<UserProfile> {
    if (!this.isInitialized) {
      return this.fallbackBehaviorAnalysis(events)
    }

    try {
      const features = this.extractFeatures(events)
      const normalizedFeatures = this.normalizeFeatures(features)
      
      // Predict behavior type
      const behaviorPrediction = await this.predictBehaviorType(normalizedFeatures)
      
      // Calculate confidence based on prediction certainty
      const confidence = this.calculateConfidence(behaviorPrediction)
      
      // Get behavior type
      const behaviorType = this.getBehaviorType(behaviorPrediction)
      
      return {
        sessionId: events[0]?.sessionId || 'unknown',
        behaviorType,
        confidenceScore: confidence,
        characteristics: {
          typingSpeed: features.typingSpeed,
          errorProne: features.errorRate > 0.2,
          mobileFinger: features.deviceType === 1,
          speedRunner: features.typingSpeed > 200 && features.completionTime < 20000,
          fieldHesitation: features.hesitationScore > 0.5,
          methodical: features.completionTime > 60000 && features.correctionRate < 0.1
        }
      }
    } catch (error) {
      console.error('Error in ML behavior analysis:', error)
      return this.fallbackBehaviorAnalysis(events)
    }
  }

  async recommendAdaptations(userProfile: UserProfile, events: BehaviorEvent[]): Promise<Adaptation[]> {
    if (!this.isInitialized) {
      return this.fallbackAdaptationRecommendation(userProfile, events)
    }

    try {
      const features = this.extractFeatures(events)
      const normalizedFeatures = this.normalizeFeatures(features)
      
      // Get behavior type probabilities
      const behaviorPrediction = await this.predictBehaviorType(normalizedFeatures)
      
      // Combine features with behavior probabilities
      const adaptationFeatures = tf.concat([
        normalizedFeatures,
        behaviorPrediction
      ], 1)
      
      // Predict adaptation scores
      const adaptationPrediction = this.adaptationModel!.predict(adaptationFeatures) as tf.Tensor
      const adaptationScores = await adaptationPrediction.data()
      
      // Convert to recommendations
      const recommendations = this.convertToAdaptations(adaptationScores, userProfile)
      
      // Clean up tensors
      behaviorPrediction.dispose()
      adaptationFeatures.dispose()
      adaptationPrediction.dispose()
      
      return recommendations
    } catch (error) {
      console.error('Error in ML adaptation recommendation:', error)
      return this.fallbackAdaptationRecommendation(userProfile, events)
    }
  }

  private extractFeatures(events: BehaviorEvent[]): BehaviorFeatures {
    if (events.length === 0) {
      return this.getDefaultFeatures()
    }

    const inputEvents = events.filter(e => e.eventType === 'field_input')
    const hoverEvents = events.filter(e => e.eventType === 'field_hover_start')
    const focusEvents = events.filter(e => e.eventType === 'field_focus')
    const blurEvents = events.filter(e => e.eventType === 'field_blur')
    
    // Calculate typing speed
    const typingSpeed = this.calculateTypingSpeed(inputEvents)
    
    // Calculate hover time
    const hoverTime = this.calculateAverageHoverTime(hoverEvents)
    
    // Calculate correction rate
    const correctionRate = this.calculateCorrectionRate(inputEvents)
    
    // Calculate hesitation score
    const hesitationScore = this.calculateHesitationScore(events)
    
    // Calculate field switch frequency
    const fieldSwitchFrequency = this.calculateFieldSwitchFrequency(focusEvents)
    
    // Calculate error rate
    const errorRate = this.calculateErrorRate(events)
    
    // Calculate completion time
    const completionTime = this.calculateCompletionTime(events)
    
    // Calculate session duration
    const sessionDuration = this.calculateSessionDuration(events)
    
    // Detect device type
    const deviceType = this.detectDeviceType(events)
    
    // Get screen size
    const screenSize = this.getScreenSize(events)
    
    // Get time context
    const timeOfDay = new Date().getHours()
    const dayOfWeek = new Date().getDay()

    return {
      typingSpeed,
      hoverTime,
      correctionRate,
      hesitationScore,
      fieldSwitchFrequency,
      errorRate,
      completionTime,
      sessionDuration,
      deviceType,
      screenSize,
      timeOfDay,
      dayOfWeek
    }
  }

  private calculateTypingSpeed(inputEvents: BehaviorEvent[]): number {
    if (inputEvents.length === 0) return 0
    
    const speeds = inputEvents
      .filter(e => e.data?.typingSpeed)
      .map(e => e.data.typingSpeed)
    
    return speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0
  }

  private calculateAverageHoverTime(hoverEvents: BehaviorEvent[]): number {
    if (hoverEvents.length === 0) return 0
    
    const times = hoverEvents
      .filter(e => e.data?.duration)
      .map(e => e.data.duration)
    
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  }

  private calculateCorrectionRate(inputEvents: BehaviorEvent[]): number {
    if (inputEvents.length === 0) return 0
    
    const correctionEvents = inputEvents.filter(e => e.data?.corrections > 0)
    return correctionEvents.length / inputEvents.length
  }

  private calculateHesitationScore(events: BehaviorEvent[]): number {
    const pauseEvents = events.filter(e => e.data?.hesitation === true)
    return pauseEvents.length / Math.max(events.length, 1)
  }

  private calculateFieldSwitchFrequency(focusEvents: BehaviorEvent[]): number {
    if (focusEvents.length === 0) return 0
    
    const uniqueFields = new Set(focusEvents.map(e => e.fieldName))
    return focusEvents.length / uniqueFields.size
  }

  private calculateErrorRate(events: BehaviorEvent[]): number {
    const errorEvents = events.filter(e => e.eventType === 'validation_error')
    return errorEvents.length / Math.max(events.length, 1)
  }

  private calculateCompletionTime(events: BehaviorEvent[]): number {
    if (events.length === 0) return 0
    
    const startTime = Math.min(...events.map(e => e.timestamp))
    const endTime = Math.max(...events.map(e => e.timestamp))
    
    return endTime - startTime
  }

  private calculateSessionDuration(events: BehaviorEvent[]): number {
    return this.calculateCompletionTime(events)
  }

  private detectDeviceType(events: BehaviorEvent[]): number {
    const touchEvents = events.filter(e => e.data?.touch === true)
    const isMobile = touchEvents.length > events.length * 0.5
    
    if (isMobile) return 1
    return 0
  }

  private getScreenSize(events: BehaviorEvent[]): number {
    const screenData = events.find(e => e.data?.screenWidth)
    return screenData?.data?.screenWidth || 1920
  }

  private getDefaultFeatures(): BehaviorFeatures {
    return {
      typingSpeed: 100,
      hoverTime: 2000,
      correctionRate: 0.1,
      hesitationScore: 0.2,
      fieldSwitchFrequency: 2,
      errorRate: 0.05,
      completionTime: 30000,
      sessionDuration: 60000,
      deviceType: 0,
      screenSize: 1920,
      timeOfDay: 12,
      dayOfWeek: 3
    }
  }

  private normalizeFeatures(features: BehaviorFeatures): tf.Tensor {
    if (!this.scaler) {
      throw new Error('Scaler not initialized')
    }

    const featureArray = [
      features.typingSpeed,
      features.hoverTime,
      features.correctionRate,
      features.hesitationScore,
      features.fieldSwitchFrequency,
      features.errorRate,
      features.completionTime,
      features.sessionDuration,
      features.deviceType,
      features.screenSize,
      features.timeOfDay,
      features.dayOfWeek
    ]

    const normalized = featureArray.map((value, index) => {
      return (value - this.scaler!.mean[index]) / this.scaler!.std[index]
    })

    return tf.tensor2d([normalized])
  }

  private async predictBehaviorType(features: tf.Tensor): Promise<tf.Tensor> {
    if (!this.behaviorModel) {
      throw new Error('Behavior model not initialized')
    }

    return this.behaviorModel.predict(features) as tf.Tensor
  }

  private calculateConfidence(prediction: tf.Tensor): number {
    const probabilities = prediction.dataSync()
    const maxProbability = Math.max(...probabilities)
    
    // Confidence is based on how certain the model is
    return Math.min(maxProbability * 2, 1.0)
  }

  private getBehaviorType(prediction: tf.Tensor): string {
    const probabilities = prediction.dataSync()
    const maxIndex = probabilities.indexOf(Math.max(...probabilities))
    
    const behaviorTypes = [
      'speed_runner',
      'methodical',
      'error_prone',
      'hesitant',
      'mobile_user',
      'average'
    ]
    
    return behaviorTypes[maxIndex] || 'average'
  }

  private convertToAdaptations(scores: Float32Array, userProfile: UserProfile): Adaptation[] {
    const adaptations: Adaptation[] = []
    const adaptationTypes = [
      'field_reorder',
      'progressive_disclosure',
      'smart_validation',
      'contextual_help'
    ]
    
    scores.forEach((score, index) => {
      if (score > 0.5) { // Threshold for recommendation
        adaptations.push({
          id: `ml_${userProfile.sessionId}_${Date.now()}_${index}`,
          type: adaptationTypes[index] as any,
          target: 'form',
          config: this.getAdaptationConfig(adaptationTypes[index], userProfile),
          confidence: score
        })
      }
    })
    
    // Sort by confidence and return top 3
    return adaptations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
  }

  private getAdaptationConfig(type: string, userProfile: UserProfile): any {
    switch (type) {
      case 'field_reorder':
        return {
          newOrder: this.getOptimalFieldOrder(userProfile)
        }
      case 'progressive_disclosure':
        return {
          fieldsToHide: ['optional_phone', 'company_size', 'referral_source'],
          triggerCondition: {
            triggerField: 'email',
            triggerValue: { pattern: '.+@.+' },
            triggerEvent: 'input'
          }
        }
      case 'smart_validation':
        return {
          fieldName: 'email',
          validationType: 'real_time',
          message: 'Please enter a valid email address',
          timing: 'immediate'
        }
      case 'contextual_help':
        return {
          fieldName: 'phone',
          helpText: 'Enter your phone number for important updates',
          trigger: 'focus',
          position: 'bottom'
        }
      default:
        return {}
    }
  }

  private getOptimalFieldOrder(userProfile: UserProfile): string[] {
    const baseOrder = ['name', 'email', 'company', 'phone', 'plan']
    
    if (userProfile.behaviorType === 'speed_runner') {
      return ['email', 'name', 'plan', 'company', 'phone']
    } else if (userProfile.behaviorType === 'mobile_user') {
      return ['name', 'email', 'phone', 'company', 'plan']
    }
    
    return baseOrder
  }

  private fallbackBehaviorAnalysis(events: BehaviorEvent[]): UserProfile {
    // Simple rule-based fallback
    const features = this.extractFeatures(events)
    
    let behaviorType = 'average'
    if (features.typingSpeed > 200 && features.completionTime < 20000) {
      behaviorType = 'speed_runner'
    } else if (features.correctionRate > 0.3) {
      behaviorType = 'error_prone'
    } else if (features.hesitationScore > 0.5) {
      behaviorType = 'hesitant'
    } else if (features.deviceType === 1) {
      behaviorType = 'mobile_user'
    } else if (features.completionTime > 60000) {
      behaviorType = 'methodical'
    }
    
    return {
      sessionId: events[0]?.sessionId || 'unknown',
      behaviorType,
      confidenceScore: Math.min(events.length / 20, 1.0),
      characteristics: {
        typingSpeed: features.typingSpeed,
        errorProne: features.correctionRate > 0.2,
        mobileFinger: features.deviceType === 1,
        speedRunner: behaviorType === 'speed_runner',
        fieldHesitation: features.hesitationScore > 0.5,
        methodical: behaviorType === 'methodical'
      }
    }
  }

  private fallbackAdaptationRecommendation(userProfile: UserProfile, events: BehaviorEvent[]): Adaptation[] {
    const adaptations: Adaptation[] = []
    
    if (userProfile.behaviorType === 'speed_runner') {
      adaptations.push({
        id: `fallback_${userProfile.sessionId}_${Date.now()}_reorder`,
        type: 'field_reorder',
        target: 'form',
        config: {
          newOrder: ['email', 'name', 'plan', 'company', 'phone']
        },
        confidence: 0.7
      })
    }
    
    if (userProfile.behaviorType === 'error_prone') {
      adaptations.push({
        id: `fallback_${userProfile.sessionId}_${Date.now()}_validation`,
        type: 'smart_validation',
        target: 'form',
        config: {
          fieldName: 'email',
          validationType: 'real_time',
          message: 'Please check your email format',
          timing: 'immediate'
        },
        confidence: 0.8
      })
    }
    
    if (userProfile.behaviorType === 'hesitant') {
      adaptations.push({
        id: `fallback_${userProfile.sessionId}_${Date.now()}_help`,
        type: 'contextual_help',
        target: 'form',
        config: {
          fieldName: 'phone',
          helpText: 'Optional: We use this for important account updates',
          trigger: 'focus',
          position: 'bottom'
        },
        confidence: 0.6
      })
    }
    
    return adaptations
  }

  async updateModel(trainingData: { features: number[][], labels: number[][] }): Promise<void> {
    if (!this.behaviorModel) return
    
    try {
      const xs = tf.tensor2d(trainingData.features)
      const ys = tf.tensor2d(trainingData.labels)
      
      await this.behaviorModel.fit(xs, ys, {
        epochs: 10,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true
      })
      
      // Save updated model
      await this.behaviorModel.save('indexeddb://behavior-model')
      
      xs.dispose()
      ys.dispose()
    } catch (error) {
      console.error('Error updating model:', error)
    }
  }

  dispose(): void {
    if (this.behaviorModel) {
      this.behaviorModel.dispose()
    }
    if (this.adaptationModel) {
      this.adaptationModel.dispose()
    }
  }
}