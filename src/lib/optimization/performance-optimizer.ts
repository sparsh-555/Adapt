import { FormAdaptation, BehaviorEvent, AdaptConfig } from '@/types'

/**
 * Performance Optimizer and Conflict Resolution System
 * Phase 2: Comprehensive performance optimization and adaptation management
 */
export class PerformanceOptimizer {
  private config: AdaptConfig
  private adaptationManager: AdaptationManager
  private performanceMonitor: PerformanceMonitor
  private conflictResolver: ConflictResolver
  private memoryManager: MemoryManager
  private debugging: boolean

  constructor(config: AdaptConfig) {
    this.config = config
    this.debugging = config.debugging || false
    
    this.adaptationManager = new AdaptationManager()
    this.performanceMonitor = new PerformanceMonitor()
    this.conflictResolver = new ConflictResolver()
    this.memoryManager = new MemoryManager()
  }

  /**
   * Optimize adaptations for performance and resolve conflicts
   */
  async optimizeAdaptations(
    newAdaptations: FormAdaptation[],
    existingAdaptations: FormAdaptation[],
    sessionContext: SessionContext
  ): Promise<OptimizationResult> {
    const startTime = performance.now()

    try {
      // Step 1: Performance filtering
      const performanceFiltered = await this.performanceFilter(newAdaptations, sessionContext)
      
      // Step 2: Conflict resolution
      const conflictResolved = await this.conflictResolver.resolve(
        performanceFiltered,
        existingAdaptations,
        sessionContext
      )
      
      // Step 3: Priority optimization
      const priorityOptimized = this.optimizePriorities(conflictResolved, sessionContext)
      
      // Step 4: Resource optimization
      const resourceOptimized = await this.optimizeResources(priorityOptimized, sessionContext)
      
      // Step 5: Performance validation
      const validated = this.validatePerformance(resourceOptimized, sessionContext)

      const optimizationTime = performance.now() - startTime

      // Record metrics
      this.performanceMonitor.recordOptimization({
        inputCount: newAdaptations.length,
        outputCount: validated.length,
        optimizationTime,
        conflictsResolved: conflictResolved.length - performanceFiltered.length,
        sessionContext
      })

      return {
        optimizedAdaptations: validated,
        metrics: {
          inputCount: newAdaptations.length,
          outputCount: validated.length,
          optimizationTime,
          conflictsResolved: this.conflictResolver.getLastResolutionCount(),
          performanceImpact: this.calculatePerformanceImpact(validated),
          memoryUsage: this.memoryManager.getCurrentUsage()
        },
        recommendations: this.generateOptimizationRecommendations(validated, sessionContext)
      }

    } catch (error) {
      if (this.debugging) {
        console.error('Optimization failed:', error)
      }
      
      // Fallback: basic conflict resolution
      const basicResolved = this.basicConflictResolution(newAdaptations, existingAdaptations)
      
      return {
        optimizedAdaptations: basicResolved,
        metrics: {
          inputCount: newAdaptations.length,
          outputCount: basicResolved.length,
          optimizationTime: performance.now() - startTime,
          conflictsResolved: 0,
          performanceImpact: 1.0,
          memoryUsage: this.memoryManager.getCurrentUsage()
        },
        recommendations: ['Optimization failed - using basic conflict resolution'],
        error: error.message
      }
    }
  }

  /**
   * Filter adaptations based on performance criteria
   */
  private async performanceFilter(
    adaptations: FormAdaptation[],
    context: SessionContext
  ): Promise<FormAdaptation[]> {
    const filtered: FormAdaptation[] = []

    for (const adaptation of adaptations) {
      // Check performance impact
      const impact = this.calculateAdaptationImpact(adaptation, context)
      
      // Check confidence threshold
      if (adaptation.confidence < (this.config.adaptationOptions?.confidenceThreshold || 0.3)) {
        continue
      }
      
      // Check resource constraints
      if (impact.memoryUsage > this.memoryManager.getAvailableMemory() * 0.1) {
        if (this.debugging) {
          console.log('Skipping adaptation due to memory constraints:', adaptation.id)
        }
        continue
      }
      
      // Check device performance
      if (context.devicePerformance === 'low' && impact.computationCost > 0.5) {
        if (this.debugging) {
          console.log('Skipping high-cost adaptation on low-performance device:', adaptation.id)
        }
        continue
      }
      
      filtered.push(adaptation)
    }

    return filtered
  }

  /**
   * Optimize adaptation priorities based on context
   */
  private optimizePriorities(
    adaptations: FormAdaptation[],
    context: SessionContext
  ): FormAdaptation[] {
    const prioritized = [...adaptations]

    // Sort by optimized priority score
    prioritized.sort((a, b) => {
      const scoreA = this.calculatePriorityScore(a, context)
      const scoreB = this.calculatePriorityScore(b, context)
      return scoreB - scoreA
    })

    // Limit based on performance constraints
    const maxAdaptations = this.getMaxAdaptations(context)
    return prioritized.slice(0, maxAdaptations)
  }

  /**
   * Calculate priority score for adaptation
   */
  private calculatePriorityScore(adaptation: FormAdaptation, context: SessionContext): number {
    let score = adaptation.confidence * 100

    // Adaptation type priority
    const typePriorities: Record<string, number> = {
      'error_prevention': 100,
      'visual_emphasis': 80,
      'context_switching': 70,
      'progressive_disclosure': 60,
      'field_reordering': 50,
      'completion_guidance': 40
    }
    score += typePriorities[adaptation.adaptationType] || 30

    // Context adjustments
    if (context.userNeedsAssistance && adaptation.adaptationType === 'error_prevention') {
      score += 50
    }
    
    if (context.isMobile && adaptation.adaptationType === 'context_switching') {
      score += 30
    }
    
    if (context.isSlowDevice && this.isLightweightAdaptation(adaptation)) {
      score += 20
    }

    // Time-based adjustments
    if (context.sessionDuration > 300000) { // 5+ minutes
      if (adaptation.adaptationType === 'progressive_disclosure') {
        score += 25
      }
    }

    return score
  }

  /**
   * Optimize resource usage
   */
  private async optimizeResources(
    adaptations: FormAdaptation[],
    context: SessionContext
  ): Promise<FormAdaptation[]> {
    const optimized: FormAdaptation[] = []
    let totalMemoryUsage = 0
    let totalComputationCost = 0

    const memoryLimit = this.memoryManager.getAvailableMemory() * 0.2 // 20% limit
    const computationLimit = context.devicePerformance === 'low' ? 0.5 : 1.0

    for (const adaptation of adaptations) {
      const impact = this.calculateAdaptationImpact(adaptation, context)
      
      if (totalMemoryUsage + impact.memoryUsage <= memoryLimit &&
          totalComputationCost + impact.computationCost <= computationLimit) {
        
        // Optimize adaptation parameters
        const optimizedAdaptation = this.optimizeAdaptationParameters(adaptation, context)
        optimized.push(optimizedAdaptation)
        
        totalMemoryUsage += impact.memoryUsage
        totalComputationCost += impact.computationCost
      } else {
        if (this.debugging) {
          console.log('Skipping adaptation due to resource constraints:', {
            adaptationId: adaptation.id,
            memoryWouldExceed: totalMemoryUsage + impact.memoryUsage > memoryLimit,
            computationWouldExceed: totalComputationCost + impact.computationCost > computationLimit
          })
        }
      }
    }

    return optimized
  }

  /**
   * Optimize individual adaptation parameters
   */
  private optimizeAdaptationParameters(
    adaptation: FormAdaptation,
    context: SessionContext
  ): FormAdaptation {
    const optimized = { ...adaptation }

    switch (adaptation.adaptationType) {
      case 'progressive_disclosure':
        // Optimize based on device performance
        if (context.isSlowDevice) {
          optimized.parameters = {
            ...optimized.parameters,
            animationDuration: Math.min(optimized.parameters.animationDuration || 300, 150),
            batchSize: Math.min(optimized.parameters.batchSize || 3, 2)
          }
        }
        break

      case 'visual_emphasis':
        // Reduce effects on low-performance devices
        if (context.devicePerformance === 'low') {
          optimized.parameters = {
            ...optimized.parameters,
            intensity: Math.min(optimized.parameters.intensity || 1, 0.7),
            duration: Math.min(optimized.parameters.duration || 2000, 1000)
          }
        }
        break

      case 'field_reordering':
        // Optimize reordering for performance
        if (context.isSlowDevice) {
          optimized.parameters = {
            ...optimized.parameters,
            useTransforms: false, // Use simple reordering instead of transforms
            animationDuration: 0 // Skip animation
          }
        }
        break
    }

    return optimized
  }

  /**
   * Calculate performance impact of adaptation
   */
  private calculateAdaptationImpact(
    adaptation: FormAdaptation,
    context: SessionContext
  ): PerformanceImpact {
    const baseImpact: PerformanceImpact = {
      memoryUsage: 1024, // 1KB base
      computationCost: 0.1,
      renderCost: 0.1,
      animationCost: 0
    }

    switch (adaptation.adaptationType) {
      case 'field_reordering':
        baseImpact.computationCost = 0.3
        baseImpact.renderCost = 0.4
        baseImpact.animationCost = 0.3
        break

      case 'progressive_disclosure':
        baseImpact.computationCost = 0.2
        baseImpact.renderCost = 0.3
        baseImpact.animationCost = 0.4
        break

      case 'visual_emphasis':
        baseImpact.computationCost = 0.1
        baseImpact.renderCost = 0.2
        baseImpact.animationCost = 0.5
        break

      case 'error_prevention':
        baseImpact.computationCost = 0.2
        baseImpact.renderCost = 0.1
        baseImpact.memoryUsage = 2048 // Event listeners
        break
    }

    // Adjust for device performance
    if (context.devicePerformance === 'low') {
      baseImpact.computationCost *= 1.5
      baseImpact.renderCost *= 1.3
      baseImpact.animationCost *= 2.0
    }

    return baseImpact
  }

  /**
   * Validate performance constraints
   */
  private validatePerformance(
    adaptations: FormAdaptation[],
    context: SessionContext
  ): FormAdaptation[] {
    const validated: FormAdaptation[] = []
    
    // Calculate total impact
    let totalImpact = adaptations.reduce((total, adaptation) => {
      const impact = this.calculateAdaptationImpact(adaptation, context)
      return {
        memoryUsage: total.memoryUsage + impact.memoryUsage,
        computationCost: total.computationCost + impact.computationCost,
        renderCost: total.renderCost + impact.renderCost,
        animationCost: total.animationCost + impact.animationCost
      }
    }, { memoryUsage: 0, computationCost: 0, renderCost: 0, animationCost: 0 })

    // Check constraints
    const constraints = this.getPerformanceConstraints(context)
    
    if (totalImpact.computationCost <= constraints.maxComputation &&
        totalImpact.renderCost <= constraints.maxRender &&
        totalImpact.animationCost <= constraints.maxAnimation) {
      return adaptations
    }

    // Remove lowest priority adaptations until constraints are met
    const sortedByPriority = [...adaptations].sort((a, b) => 
      this.calculatePriorityScore(b, context) - this.calculatePriorityScore(a, context)
    )

    for (const adaptation of sortedByPriority) {
      const impact = this.calculateAdaptationImpact(adaptation, context)
      
      if (totalImpact.computationCost - impact.computationCost <= constraints.maxComputation &&
          totalImpact.renderCost - impact.renderCost <= constraints.maxRender &&
          totalImpact.animationCost - impact.animationCost <= constraints.maxAnimation) {
        validated.push(adaptation)
      } else {
        totalImpact.computationCost -= impact.computationCost
        totalImpact.renderCost -= impact.renderCost
        totalImpact.animationCost -= impact.animationCost
      }
    }

    return validated
  }

  /**
   * Get performance constraints based on context
   */
  private getPerformanceConstraints(context: SessionContext): PerformanceConstraints {
    if (context.devicePerformance === 'low') {
      return {
        maxComputation: 0.3,
        maxRender: 0.3,
        maxAnimation: 0.2,
        maxMemory: 5 * 1024 // 5KB
      }
    }
    
    if (context.devicePerformance === 'medium') {
      return {
        maxComputation: 0.6,
        maxRender: 0.6,
        maxAnimation: 0.5,
        maxMemory: 15 * 1024 // 15KB
      }
    }
    
    return {
      maxComputation: 1.0,
      maxRender: 1.0,
      maxAnimation: 1.0,
      maxMemory: 50 * 1024 // 50KB
    }
  }

  /**
   * Calculate overall performance impact
   */
  private calculatePerformanceImpact(adaptations: FormAdaptation[]): number {
    if (adaptations.length === 0) return 0
    
    const totalImpact = adaptations.reduce((sum, adaptation) => {
      const impact = this.calculateAdaptationImpact(adaptation, { 
        devicePerformance: 'medium' 
      } as SessionContext)
      return sum + impact.computationCost + impact.renderCost + impact.animationCost
    }, 0)
    
    return totalImpact / adaptations.length
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    adaptations: FormAdaptation[],
    context: SessionContext
  ): string[] {
    const recommendations: string[] = []

    if (adaptations.length === 0) {
      recommendations.push('No adaptations applied due to performance constraints')
      return recommendations
    }

    const totalImpact = this.calculatePerformanceImpact(adaptations)
    
    if (totalImpact > 0.7) {
      recommendations.push('High performance impact detected - consider reducing adaptation complexity')
    }
    
    if (context.devicePerformance === 'low' && adaptations.length > 2) {
      recommendations.push('Low-performance device - consider limiting adaptations')
    }
    
    const animationCount = adaptations.filter(a => 
      ['visual_emphasis', 'progressive_disclosure', 'field_reordering'].includes(a.adaptationType)
    ).length
    
    if (animationCount > 3) {
      recommendations.push('Multiple animations detected - consider staggering or reducing')
    }

    if (recommendations.length === 0) {
      recommendations.push('Optimal performance configuration achieved')
    }

    return recommendations
  }

  /**
   * Basic conflict resolution fallback
   */
  private basicConflictResolution(
    newAdaptations: FormAdaptation[],
    existingAdaptations: FormAdaptation[]
  ): FormAdaptation[] {
    const resolved: FormAdaptation[] = []
    const existingTypes = new Set(existingAdaptations.map(a => a.adaptationType))

    for (const adaptation of newAdaptations) {
      if (!existingTypes.has(adaptation.adaptationType)) {
        resolved.push(adaptation)
      } else {
        // Keep higher confidence adaptation
        const existing = existingAdaptations.find(a => a.adaptationType === adaptation.adaptationType)
        if (existing && adaptation.confidence > existing.confidence) {
          resolved.push(adaptation)
        }
      }
    }

    return resolved
  }

  /**
   * Helper methods
   */
  private getMaxAdaptations(context: SessionContext): number {
    if (context.devicePerformance === 'low') return 2
    if (context.devicePerformance === 'medium') return 4
    return this.config.adaptationOptions?.maxAdaptationsPerSession || 6
  }

  private isLightweightAdaptation(adaptation: FormAdaptation): boolean {
    return ['error_prevention', 'completion_guidance'].includes(adaptation.adaptationType)
  }

  /**
   * Get optimizer status
   */
  getStatus(): OptimizerStatus {
    return {
      memoryUsage: this.memoryManager.getCurrentUsage(),
      performanceMetrics: this.performanceMonitor.getMetrics(),
      conflictResolutionStats: this.conflictResolver.getStats(),
      lastOptimizationTime: this.performanceMonitor.getLastOptimizationTime()
    }
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.performanceMonitor.dispose()
    this.memoryManager.dispose()
  }
}

/**
 * Adaptation Manager for tracking and organizing adaptations
 */
class AdaptationManager {
  private activeAdaptations: Map<string, FormAdaptation> = new Map()
  private adaptationHistory: AdaptationHistoryEntry[] = []

  trackAdaptation(adaptation: FormAdaptation): void {
    this.activeAdaptations.set(adaptation.id, adaptation)
    this.adaptationHistory.push({
      adaptation,
      appliedAt: Date.now(),
      status: 'active'
    })
    
    // Keep history limited
    if (this.adaptationHistory.length > 100) {
      this.adaptationHistory.shift()
    }
  }

  getActiveAdaptations(): FormAdaptation[] {
    return Array.from(this.activeAdaptations.values())
  }

  removeAdaptation(adaptationId: string): void {
    this.activeAdaptations.delete(adaptationId)
    
    const historyEntry = this.adaptationHistory.find(entry => entry.adaptation.id === adaptationId)
    if (historyEntry) {
      historyEntry.status = 'removed'
      historyEntry.removedAt = Date.now()
    }
  }
}

/**
 * Conflict Resolver for handling adaptation conflicts
 */
class ConflictResolver {
  private lastResolutionCount = 0

  async resolve(
    newAdaptations: FormAdaptation[],
    existingAdaptations: FormAdaptation[],
    context: SessionContext
  ): Promise<FormAdaptation[]> {
    const resolved: FormAdaptation[] = []
    const conflicts: ConflictSet[] = []

    // Identify conflicts
    for (const newAdaptation of newAdaptations) {
      const conflictingExisting = existingAdaptations.filter(existing => 
        this.hasConflict(newAdaptation, existing)
      )

      if (conflictingExisting.length > 0) {
        conflicts.push({
          newAdaptation,
          conflictingAdaptations: conflictingExisting,
          resolutionStrategy: this.determineResolutionStrategy(newAdaptation, conflictingExisting, context)
        })
      } else {
        resolved.push(newAdaptation)
      }
    }

    // Resolve conflicts
    for (const conflict of conflicts) {
      const resolution = await this.resolveConflict(conflict, context)
      if (resolution) {
        resolved.push(resolution)
      }
    }

    this.lastResolutionCount = conflicts.length
    return resolved
  }

  private hasConflict(adaptation1: FormAdaptation, adaptation2: FormAdaptation): boolean {
    // Same form and conflicting types
    if (adaptation1.formId !== adaptation2.formId) return false

    const conflictMatrix: Record<string, string[]> = {
      'field_reordering': ['progressive_disclosure'],
      'progressive_disclosure': ['field_reordering'],
      'visual_emphasis': ['visual_emphasis'], // Only one visual emphasis at a time
    }

    const conflicts = conflictMatrix[adaptation1.adaptationType] || []
    return conflicts.includes(adaptation2.adaptationType) || adaptation1.adaptationType === adaptation2.adaptationType
  }

  private determineResolutionStrategy(
    newAdaptation: FormAdaptation,
    conflicts: FormAdaptation[],
    context: SessionContext
  ): ResolutionStrategy {
    // Higher confidence wins
    const maxConflictConfidence = Math.max(...conflicts.map(c => c.confidence))
    if (newAdaptation.confidence > maxConflictConfidence + 0.1) {
      return 'replace'
    }

    // Context-based decisions
    if (context.userNeedsAssistance && newAdaptation.adaptationType === 'error_prevention') {
      return 'replace'
    }

    if (context.isMobile && newAdaptation.adaptationType === 'context_switching') {
      return 'merge'
    }

    return 'skip'
  }

  private async resolveConflict(conflict: ConflictSet, context: SessionContext): Promise<FormAdaptation | null> {
    switch (conflict.resolutionStrategy) {
      case 'replace':
        return conflict.newAdaptation

      case 'merge':
        return this.mergeAdaptations(conflict.newAdaptation, conflict.conflictingAdaptations[0])

      case 'skip':
        return null

      default:
        return conflict.newAdaptation
    }
  }

  private mergeAdaptations(adaptation1: FormAdaptation, adaptation2: FormAdaptation): FormAdaptation {
    return {
      ...adaptation1,
      confidence: Math.max(adaptation1.confidence, adaptation2.confidence),
      parameters: {
        ...adaptation2.parameters,
        ...adaptation1.parameters
      },
      description: `Merged: ${adaptation1.description} + ${adaptation2.description}`,
      metadata: {
        ...adaptation1.metadata,
        merged: true,
        originalAdaptations: [adaptation1.id, adaptation2.id]
      }
    }
  }

  getLastResolutionCount(): number {
    return this.lastResolutionCount
  }

  getStats(): ConflictResolutionStats {
    return {
      totalConflictsResolved: this.lastResolutionCount,
      // More stats would be tracked in a real implementation
    }
  }
}

/**
 * Performance Monitor for tracking system performance
 */
class PerformanceMonitor {
  private metrics: OptimizationMetrics[] = []
  private lastOptimizationTime = 0

  recordOptimization(metrics: OptimizationMetrics): void {
    this.metrics.push(metrics)
    this.lastOptimizationTime = Date.now()
    
    // Keep only recent metrics
    if (this.metrics.length > 50) {
      this.metrics.shift()
    }
  }

  getMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        averageOptimizationTime: 0,
        averageInputCount: 0,
        averageOutputCount: 0,
        averageConflictsResolved: 0,
        totalOptimizations: 0
      }
    }

    return {
      averageOptimizationTime: this.metrics.reduce((sum, m) => sum + m.optimizationTime, 0) / this.metrics.length,
      averageInputCount: this.metrics.reduce((sum, m) => sum + m.inputCount, 0) / this.metrics.length,
      averageOutputCount: this.metrics.reduce((sum, m) => sum + m.outputCount, 0) / this.metrics.length,
      averageConflictsResolved: this.metrics.reduce((sum, m) => sum + m.conflictsResolved, 0) / this.metrics.length,
      totalOptimizations: this.metrics.length
    }
  }

  getLastOptimizationTime(): number {
    return this.lastOptimizationTime
  }

  dispose(): void {
    this.metrics = []
  }
}

/**
 * Memory Manager for tracking memory usage
 */
class MemoryManager {
  getCurrentUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize || 0
    }
    return 0
  }

  getAvailableMemory(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      return (memory.jsHeapSizeLimit - memory.usedJSHeapSize) || 100 * 1024 * 1024 // 100MB default
    }
    return 100 * 1024 * 1024 // 100MB default
  }

  dispose(): void {
    // Cleanup if needed
  }
}

// Type definitions
interface SessionContext {
  devicePerformance: 'low' | 'medium' | 'high'
  isMobile: boolean
  isSlowDevice: boolean
  userNeedsAssistance: boolean
  sessionDuration: number
}

interface OptimizationResult {
  optimizedAdaptations: FormAdaptation[]
  metrics: {
    inputCount: number
    outputCount: number
    optimizationTime: number
    conflictsResolved: number
    performanceImpact: number
    memoryUsage: number
  }
  recommendations: string[]
  error?: string
}

interface PerformanceImpact {
  memoryUsage: number
  computationCost: number
  renderCost: number
  animationCost: number
}

interface PerformanceConstraints {
  maxComputation: number
  maxRender: number
  maxAnimation: number
  maxMemory: number
}

interface OptimizationMetrics {
  inputCount: number
  outputCount: number
  optimizationTime: number
  conflictsResolved: number
  sessionContext: SessionContext
}

interface PerformanceMetrics {
  averageOptimizationTime: number
  averageInputCount: number
  averageOutputCount: number
  averageConflictsResolved: number
  totalOptimizations: number
}

interface ConflictSet {
  newAdaptation: FormAdaptation
  conflictingAdaptations: FormAdaptation[]
  resolutionStrategy: ResolutionStrategy
}

type ResolutionStrategy = 'replace' | 'merge' | 'skip'

interface ConflictResolutionStats {
  totalConflictsResolved: number
}

interface AdaptationHistoryEntry {
  adaptation: FormAdaptation
  appliedAt: number
  status: 'active' | 'removed'
  removedAt?: number
}

interface OptimizerStatus {
  memoryUsage: number
  performanceMetrics: PerformanceMetrics
  conflictResolutionStats: ConflictResolutionStats
  lastOptimizationTime: number
}

export { PerformanceOptimizer }
export type { 
  OptimizationResult, 
  SessionContext, 
  PerformanceImpact, 
  OptimizerStatus 
}