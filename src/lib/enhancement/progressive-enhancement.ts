import { BehaviorEvent, FormAdaptation, AdaptConfig } from '@/types'
import { EdgeMLEngine } from '../ml/edge-ml'
import { ClientMLEngine } from '../ml/client-ml'

/**
 * Progressive Enhancement Framework with Graceful Fallbacks
 * Phase 2: Ensures reliable performance across all scenarios
 */
export class ProgressiveEnhancementFramework {
  private config: AdaptConfig
  private edgeML: EdgeMLEngine
  private clientML: ClientMLEngine | null = null
  private fallbackSystem: FallbackSystem
  private performanceMonitor: PerformanceMonitor
  private adaptationPipeline: AdaptationPipeline
  private debugging: boolean

  constructor(config: AdaptConfig) {
    this.config = config
    this.debugging = config.debugging || false
    
    // Initialize core components
    this.edgeML = new EdgeMLEngine({
      confidenceThreshold: 0.3,
      debugging: this.debugging
    })
    
    this.fallbackSystem = new FallbackSystem()
    this.performanceMonitor = new PerformanceMonitor()
    this.adaptationPipeline = new AdaptationPipeline(this.performanceMonitor)

    // Initialize client ML based on device capabilities
    this.initializeClientML()
  }

  /**
   * Process events with progressive enhancement
   */
  async processEvents(
    events: BehaviorEvent[],
    sessionId: string,
    formId: string
  ): Promise<EnhancedProcessingResult> {
    const startTime = performance.now()
    
    try {
      // Phase 1: Edge ML Processing (Target: <5ms)
      const edgeResult = await this.processWithEdgeML(events, sessionId, formId)
      
      // Phase 2: Client ML Enhancement (Progressive, non-blocking)
      const enhancementPromise = this.enhanceWithClientML(edgeResult, events)
      
      // Phase 3: Apply immediate adaptations
      const immediateAdaptations = edgeResult.adaptations

      // Phase 4: Wait for enhancements (with timeout)
      const enhancedAdaptations = await this.waitForEnhancement(
        enhancementPromise,
        500 // 500ms timeout for client ML
      )

      // Combine results
      const finalAdaptations = this.combineAdaptations(
        immediateAdaptations,
        enhancedAdaptations
      )

      const totalTime = performance.now() - startTime

      // Record performance metrics
      this.performanceMonitor.recordProcessing({
        sessionId,
        formId,
        totalTime,
        edgeTime: edgeResult.processingTime,
        clientMLSuccess: enhancedAdaptations.length > 0,
        eventCount: events.length,
        adaptationCount: finalAdaptations.length
      })

      return {
        success: true,
        adaptations: finalAdaptations,
        processingTime: totalTime,
        layers: {
          edge: {
            success: true,
            time: edgeResult.processingTime,
            adaptationCount: immediateAdaptations.length
          },
          client: {
            success: enhancedAdaptations.length > 0,
            time: enhancedAdaptations.length > 0 ? totalTime - edgeResult.processingTime : 0,
            adaptationCount: enhancedAdaptations.length
          }
        },
        fallbackUsed: false,
        performanceMetrics: this.performanceMonitor.getMetrics()
      }

    } catch (error) {
      if (this.debugging) {
        console.warn('Progressive enhancement failed, using fallback:', error)
      }

      // Graceful fallback
      const fallbackResult = await this.fallbackSystem.process(events, sessionId, formId)
      
      return {
        success: true,
        adaptations: fallbackResult.adaptations,
        processingTime: performance.now() - startTime,
        layers: {
          edge: { success: false, time: 0, adaptationCount: 0 },
          client: { success: false, time: 0, adaptationCount: 0 }
        },
        fallbackUsed: true,
        error: error.message,
        performanceMetrics: this.performanceMonitor.getMetrics()
      }
    }
  }

  /**
   * Process events with Edge ML
   */
  private async processWithEdgeML(
    events: BehaviorEvent[],
    sessionId: string,
    formId: string
  ): Promise<EdgeProcessingResult> {
    const startTime = performance.now()

    try {
      // Extract features for edge ML
      const features = this.edgeML.extractFeatures(events)
      
      // Run prediction
      const prediction = this.edgeML.predict(features)
      
      // Generate adaptations
      const adaptations = this.edgeML.generateAdaptations(prediction, sessionId, formId)
      
      const processingTime = performance.now() - startTime

      if (this.debugging) {
        console.log('Edge ML processing completed:', {
          processingTime: `${Math.round(processingTime)}ms`,
          userType: prediction.userType,
          confidence: prediction.confidence,
          adaptationCount: adaptations.length
        })
      }

      return {
        success: true,
        adaptations,
        prediction,
        features,
        processingTime
      }

    } catch (error) {
      if (this.debugging) {
        console.error('Edge ML processing failed:', error)
      }
      throw error
    }
  }

  /**
   * Enhance with Client ML (progressive, non-blocking)
   */
  private async enhanceWithClientML(
    edgeResult: EdgeProcessingResult,
    events: BehaviorEvent[]
  ): Promise<FormAdaptation[]> {
    if (!this.clientML || !this.clientML.isAvailable()) {
      return [] // No enhancement available
    }

    try {
      // Run client-side enhancement
      const enhancedAdaptations = await this.clientML.enhanceAdaptations(
        edgeResult.features,
        edgeResult.adaptations
      )

      if (this.debugging) {
        console.log('Client ML enhancement completed:', {
          enhancementCount: enhancedAdaptations.length,
          capabilities: this.clientML.getCapabilities()
        })
      }

      return enhancedAdaptations.map(enhancement => ({
        id: enhancement.id,
        sessionId: edgeResult.adaptations[0]?.sessionId || '',
        formId: edgeResult.adaptations[0]?.formId || '',
        adaptationType: enhancement.type,
        confidence: enhancement.confidence,
        parameters: enhancement.parameters,
        config: {},
        cssChanges: {},
        jsChanges: '',
        appliedAt: new Date().toISOString(),
        isActive: true,
        description: `Client ML enhancement: ${enhancement.reasoning.join(', ')}`,
        metadata: {
          source: 'client_ml_enhancement',
          priority: enhancement.priority,
          reasoning: enhancement.reasoning,
          enhanced: true
        }
      }))

    } catch (error) {
      if (this.debugging) {
        console.warn('Client ML enhancement failed:', error)
      }
      return [] // Graceful degradation
    }
  }

  /**
   * Wait for client ML enhancement with timeout
   */
  private async waitForEnhancement(
    enhancementPromise: Promise<FormAdaptation[]>,
    timeout: number
  ): Promise<FormAdaptation[]> {
    try {
      const timeoutPromise = new Promise<FormAdaptation[]>((resolve) => {
        setTimeout(() => resolve([]), timeout)
      })

      return await Promise.race([enhancementPromise, timeoutPromise])
    } catch (error) {
      if (this.debugging) {
        console.warn('Enhancement timeout or error:', error)
      }
      return []
    }
  }

  /**
   * Combine edge and client ML adaptations
   */
  private combineAdaptations(
    edgeAdaptations: any[],
    clientAdaptations: FormAdaptation[]
  ): FormAdaptation[] {
    const combined: FormAdaptation[] = []

    // Convert edge adaptations to full format
    edgeAdaptations.forEach(adaptation => {
      combined.push({
        id: adaptation.id,
        sessionId: adaptation.sessionId,
        formId: adaptation.formId,
        adaptationType: adaptation.adaptationType,
        confidence: adaptation.confidence,
        parameters: adaptation.parameters,
        config: {},
        cssChanges: {},
        jsChanges: '',
        appliedAt: adaptation.appliedAt,
        isActive: true,
        description: `Edge ML: ${adaptation.adaptationType}`,
        metadata: {
          source: 'edge_ml',
          userType: adaptation.userType,
          layer: 'edge'
        }
      })
    })

    // Add client ML enhancements
    clientAdaptations.forEach(adaptation => {
      // Check for conflicts and merge or replace
      const conflictIndex = combined.findIndex(existing => 
        existing.adaptationType === adaptation.adaptationType &&
        existing.formId === adaptation.formId
      )

      if (conflictIndex >= 0) {
        // Replace if client ML has higher confidence
        if (adaptation.confidence > combined[conflictIndex].confidence) {
          combined[conflictIndex] = adaptation
        }
      } else {
        // Add as new adaptation
        combined.push(adaptation)
      }
    })

    // Sort by confidence
    combined.sort((a, b) => b.confidence - a.confidence)

    return combined
  }

  /**
   * Initialize client ML based on device capabilities
   */
  private async initializeClientML(): Promise<void> {
    try {
      // Check device capabilities
      const capabilities = this.assessDeviceCapabilities()
      
      if (capabilities.canRunClientML) {
        this.clientML = new ClientMLEngine({
          modelUrl: '/models/behavior-model.onnx',
          executionProviders: capabilities.preferredProviders,
          memoryLimit: capabilities.memoryLimit,
          debugging: this.debugging
        })

        // Initialize in background (non-blocking)
        this.clientML.initialize().catch(error => {
          if (this.debugging) {
            console.warn('Client ML initialization failed:', error)
          }
          this.clientML = null
        })

        if (this.debugging) {
          console.log('Client ML initialization started:', capabilities)
        }
      } else {
        if (this.debugging) {
          console.log('Client ML not supported on this device:', capabilities)
        }
      }
    } catch (error) {
      if (this.debugging) {
        console.warn('Failed to initialize client ML:', error)
      }
    }
  }

  /**
   * Assess device capabilities for client ML
   */
  private assessDeviceCapabilities(): DeviceCapabilities {
    if (typeof window === 'undefined') {
      return {
        canRunClientML: false,
        preferredProviders: ['wasm'],
        memoryLimit: 0,
        reason: 'Server-side environment'
      }
    }

    const capabilities: DeviceCapabilities = {
      canRunClientML: false,
      preferredProviders: ['wasm'],
      memoryLimit: 32 * 1024 * 1024, // 32MB default
      reason: 'Assessment incomplete'
    }

    // Check basic requirements
    if (!('WebAssembly' in window)) {
      capabilities.reason = 'WebAssembly not supported'
      return capabilities
    }

    // Check memory
    const memory = (performance as any).memory
    if (memory && memory.usedJSHeapSize) {
      const availableMemory = memory.jsHeapSizeLimit - memory.usedJSHeapSize
      if (availableMemory < 50 * 1024 * 1024) { // 50MB minimum
        capabilities.reason = 'Insufficient memory'
        return capabilities
      }
      capabilities.memoryLimit = Math.min(availableMemory * 0.2, 100 * 1024 * 1024) // 20% of available, max 100MB
    }

    // Check GPU support
    if ('gpu' in navigator) {
      capabilities.preferredProviders = ['webgpu', 'wasm']
    }

    // Check device type
    const userAgent = navigator.userAgent
    const isMobile = /Mobile|Android|iPhone/i.test(userAgent)
    const isLowPowered = /Android.*?[0-9]\./ .test(userAgent) // Simple Android version check

    if (isMobile && isLowPowered) {
      capabilities.reason = 'Low-powered mobile device'
      return capabilities
    }

    // Check hardware concurrency
    const cores = navigator.hardwareConcurrency || 1
    if (cores < 2) {
      capabilities.reason = 'Insufficient CPU cores'
      return capabilities
    }

    // All checks passed
    capabilities.canRunClientML = true
    capabilities.reason = 'Device capable'

    return capabilities
  }

  /**
   * Get framework status and metrics
   */
  getStatus(): FrameworkStatus {
    return {
      edgeMLAvailable: true,
      clientMLAvailable: this.clientML?.isAvailable() || false,
      deviceCapabilities: this.assessDeviceCapabilities(),
      performanceMetrics: this.performanceMonitor.getMetrics(),
      fallbackSystemStatus: this.fallbackSystem.getStatus(),
      adaptationPipelineStatus: this.adaptationPipeline.getStatus()
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.clientML) {
      this.clientML.dispose()
      this.clientML = null
    }

    this.performanceMonitor.dispose()
    this.adaptationPipeline.dispose()
  }
}

/**
 * Fallback System for when ML components fail
 */
class FallbackSystem {
  private rules: FallbackRule[] = []

  constructor() {
    this.initializeRules()
  }

  async process(
    events: BehaviorEvent[],
    sessionId: string,
    formId: string
  ): Promise<FallbackResult> {
    const adaptations: FormAdaptation[] = []

    // Apply fallback rules
    for (const rule of this.rules) {
      if (rule.condition(events)) {
        const adaptation = rule.generate(events, sessionId, formId)
        if (adaptation) {
          adaptations.push(adaptation)
        }
      }
    }

    return {
      success: true,
      adaptations,
      rulesApplied: adaptations.length
    }
  }

  private initializeRules(): void {
    // Rule 1: High error rate → Error prevention
    this.rules.push({
      name: 'high_error_rate',
      condition: (events) => {
        const keyEvents = events.filter(e => e.eventType === 'key_press')
        const backspaceEvents = keyEvents.filter(e => e.data?.key === 'Backspace')
        return keyEvents.length > 0 && (backspaceEvents.length / keyEvents.length) > 0.2
      },
      generate: (events, sessionId, formId) => ({
        id: `fallback_${Date.now()}_error_prevention`,
        sessionId,
        formId,
        adaptationType: 'error_prevention',
        confidence: 0.6,
        parameters: {
          enableRealTimeValidation: true,
          enableInlineHelp: true,
          showHelpText: true
        },
        config: {},
        cssChanges: {},
        jsChanges: '',
        appliedAt: new Date().toISOString(),
        isActive: true,
        description: 'Fallback: Error prevention for high error rate',
        metadata: { source: 'fallback_rule', rule: 'high_error_rate' }
      })
    })

    // Rule 2: Mobile device → Context switching
    this.rules.push({
      name: 'mobile_optimization',
      condition: (events) => {
        const userAgent = events[0]?.userAgent || ''
        return /Mobile|Android|iPhone|iPad/i.test(userAgent)
      },
      generate: (events, sessionId, formId) => ({
        id: `fallback_${Date.now()}_context_switching`,
        sessionId,
        formId,
        adaptationType: 'context_switching',
        confidence: 0.7,
        parameters: {
          mobileOptimized: true,
          reducedFields: true,
          largerTouchTargets: true
        },
        config: {},
        cssChanges: {},
        jsChanges: '',
        appliedAt: new Date().toISOString(),
        isActive: true,
        description: 'Fallback: Mobile optimization',
        metadata: { source: 'fallback_rule', rule: 'mobile_optimization' }
      })
    })

    // Rule 3: Long session duration → Progressive disclosure
    this.rules.push({
      name: 'long_session',
      condition: (events) => {
        if (events.length < 2) return false
        const duration = (events[events.length - 1]?.timestamp || 0) - (events[0]?.timestamp || 0)
        return duration > 300000 // 5 minutes
      },
      generate: (events, sessionId, formId) => ({
        id: `fallback_${Date.now()}_progressive_disclosure`,
        sessionId,
        formId,
        adaptationType: 'progressive_disclosure',
        confidence: 0.5,
        parameters: {
          initialFields: 3,
          strategy: 'step_by_step'
        },
        config: {},
        cssChanges: {},
        jsChanges: '',
        appliedAt: new Date().toISOString(),
        isActive: true,
        description: 'Fallback: Progressive disclosure for long session',
        metadata: { source: 'fallback_rule', rule: 'long_session' }
      })
    })
  }

  getStatus(): FallbackSystemStatus {
    return {
      rulesLoaded: this.rules.length,
      rulesActive: this.rules.length,
      lastActivation: null
    }
  }
}

/**
 * Performance Monitor for tracking system performance
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    totalProcessingTime: 0,
    edgeMLTime: 0,
    clientMLTime: 0,
    fallbackUsage: 0,
    successRate: 0,
    averageResponseTime: 0,
    processedEvents: 0,
    generatedAdaptations: 0,
    sessionCount: 0
  }

  private sessions: ProcessingSession[] = []

  recordProcessing(session: ProcessingSession): void {
    this.sessions.push(session)
    
    // Keep only recent sessions (last 100)
    if (this.sessions.length > 100) {
      this.sessions.shift()
    }

    this.updateMetrics()
  }

  private updateMetrics(): void {
    if (this.sessions.length === 0) return

    const recent = this.sessions.slice(-50) // Last 50 sessions
    
    this.metrics.sessionCount = this.sessions.length
    this.metrics.averageResponseTime = recent.reduce((sum, s) => sum + s.totalTime, 0) / recent.length
    this.metrics.edgeMLTime = recent.reduce((sum, s) => sum + s.edgeTime, 0) / recent.length
    this.metrics.clientMLTime = recent.filter(s => s.clientMLSuccess).reduce((sum, s) => sum + (s.totalTime - s.edgeTime), 0) / Math.max(recent.filter(s => s.clientMLSuccess).length, 1)
    this.metrics.successRate = recent.filter(s => s.clientMLSuccess).length / recent.length
    this.metrics.processedEvents = recent.reduce((sum, s) => sum + s.eventCount, 0)
    this.metrics.generatedAdaptations = recent.reduce((sum, s) => sum + s.adaptationCount, 0)
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  dispose(): void {
    this.sessions = []
  }
}

/**
 * Adaptation Pipeline for managing adaptation flow
 */
class AdaptationPipeline {
  private performanceMonitor: PerformanceMonitor
  private queue: AdaptationTask[] = []
  private processing = false

  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor
  }

  async processAdaptations(adaptations: FormAdaptation[]): Promise<void> {
    // Add to queue
    adaptations.forEach(adaptation => {
      this.queue.push({
        adaptation,
        priority: this.calculatePriority(adaptation),
        timestamp: Date.now()
      })
    })

    // Sort by priority
    this.queue.sort((a, b) => b.priority - a.priority)

    // Process queue
    if (!this.processing) {
      await this.processQueue()
    }
  }

  private async processQueue(): Promise<void> {
    this.processing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()
      if (task) {
        await this.processTask(task)
      }
    }

    this.processing = false
  }

  private async processTask(task: AdaptationTask): Promise<void> {
    // Process individual adaptation task
    // This would integrate with the DOM adapter
  }

  private calculatePriority(adaptation: FormAdaptation): number {
    let priority = adaptation.confidence * 100

    // Adjust based on adaptation type
    switch (adaptation.adaptationType) {
      case 'error_prevention':
        priority += 50 // High priority
        break
      case 'visual_emphasis':
        priority += 30
        break
      case 'progressive_disclosure':
        priority += 20
        break
      default:
        priority += 10
    }

    return priority
  }

  getStatus(): AdaptationPipelineStatus {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      totalProcessed: 0 // Would track this in real implementation
    }
  }

  dispose(): void {
    this.queue = []
    this.processing = false
  }
}

// Type definitions
interface EnhancedProcessingResult {
  success: boolean
  adaptations: FormAdaptation[]
  processingTime: number
  layers: {
    edge: {
      success: boolean
      time: number
      adaptationCount: number
    }
    client: {
      success: boolean
      time: number
      adaptationCount: number
    }
  }
  fallbackUsed: boolean
  error?: string
  performanceMetrics: PerformanceMetrics
}

interface EdgeProcessingResult {
  success: boolean
  adaptations: any[]
  prediction: any
  features: any
  processingTime: number
}

interface DeviceCapabilities {
  canRunClientML: boolean
  preferredProviders: string[]
  memoryLimit: number
  reason: string
}

interface FrameworkStatus {
  edgeMLAvailable: boolean
  clientMLAvailable: boolean
  deviceCapabilities: DeviceCapabilities
  performanceMetrics: PerformanceMetrics
  fallbackSystemStatus: FallbackSystemStatus
  adaptationPipelineStatus: AdaptationPipelineStatus
}

interface FallbackRule {
  name: string
  condition: (events: BehaviorEvent[]) => boolean
  generate: (events: BehaviorEvent[], sessionId: string, formId: string) => FormAdaptation | null
}

interface FallbackResult {
  success: boolean
  adaptations: FormAdaptation[]
  rulesApplied: number
}

interface FallbackSystemStatus {
  rulesLoaded: number
  rulesActive: number
  lastActivation: number | null
}

interface PerformanceMetrics {
  totalProcessingTime: number
  edgeMLTime: number
  clientMLTime: number
  fallbackUsage: number
  successRate: number
  averageResponseTime: number
  processedEvents: number
  generatedAdaptations: number
  sessionCount: number
}

interface ProcessingSession {
  sessionId: string
  formId: string
  totalTime: number
  edgeTime: number
  clientMLSuccess: boolean
  eventCount: number
  adaptationCount: number
}

interface AdaptationTask {
  adaptation: FormAdaptation
  priority: number
  timestamp: number
}

interface AdaptationPipelineStatus {
  queueLength: number
  processing: boolean
  totalProcessed: number
}

export { ProgressiveEnhancementFramework }
export type { 
  EnhancedProcessingResult, 
  DeviceCapabilities, 
  FrameworkStatus,
  PerformanceMetrics 
}