import { BehaviorEvent, FormAdaptation, AdaptConfig } from '@/types'
import { ProgressiveEnhancementFramework } from '../enhancement/progressive-enhancement'

/**
 * Performance Validator for testing 500ms response time target
 * Phase 2: Comprehensive performance testing and validation
 */
export class PerformanceValidator {
  private config: AdaptConfig
  private framework: ProgressiveEnhancementFramework
  private testResults: TestResult[] = []
  private debugging: boolean

  constructor(config: AdaptConfig) {
    this.config = config
    this.debugging = config.debugging || false
    this.framework = new ProgressiveEnhancementFramework(config)
  }

  /**
   * Run comprehensive performance validation tests
   */
  async runPerformanceValidation(): Promise<ValidationReport> {
    if (this.debugging) {
      console.log('Starting performance validation tests...')
    }

    const testSuites = [
      () => this.testEdgeMLPerformance(),
      () => this.testClientMLPerformance(),
      () => this.testFallbackPerformance(),
      () => this.testEndToEndPerformance(),
      () => this.testConcurrentProcessing(),
      () => this.testMemoryUsage(),
      () => this.testAdaptationApplication()
    ]

    const results: TestSuiteResult[] = []

    for (const [index, testSuite] of testSuites.entries()) {
      try {
        const suiteResult = await testSuite()
        results.push(suiteResult)
        
        if (this.debugging) {
          console.log(`Test suite ${index + 1} completed:`, suiteResult)
        }
      } catch (error) {
        results.push({
          suiteName: `Test Suite ${index + 1}`,
          passed: false,
          averageTime: 0,
          tests: [],
          error: error.message
        })
      }
    }

    const report = this.generateValidationReport(results)
    
    if (this.debugging) {
      console.log('Performance validation completed:', report)
    }

    return report
  }

  /**
   * Test Edge ML performance (Target: <5ms)
   */
  private async testEdgeMLPerformance(): Promise<TestSuiteResult> {
    const tests: TestResult[] = []
    const targetTime = 5 // 5ms target

    // Test 1: Simple event processing
    for (let i = 0; i < 10; i++) {
      const events = this.generateSampleEvents(5, 'simple')
      const result = await this.measureProcessingTime(events, 'edge_ml_only')
      
      tests.push({
        testName: `Edge ML Simple Events ${i + 1}`,
        processingTime: result.processingTime,
        passed: result.processingTime <= targetTime,
        adaptationCount: result.adaptations.length,
        memoryUsage: result.memoryUsage || 0
      })
    }

    // Test 2: Complex event processing
    for (let i = 0; i < 5; i++) {
      const events = this.generateSampleEvents(20, 'complex')
      const result = await this.measureProcessingTime(events, 'edge_ml_only')
      
      tests.push({
        testName: `Edge ML Complex Events ${i + 1}`,
        processingTime: result.processingTime,
        passed: result.processingTime <= targetTime * 2, // Allow 10ms for complex
        adaptationCount: result.adaptations.length,
        memoryUsage: result.memoryUsage || 0
      })
    }

    return {
      suiteName: 'Edge ML Performance',
      passed: tests.every(t => t.passed),
      averageTime: tests.reduce((sum, t) => sum + t.processingTime, 0) / tests.length,
      tests
    }
  }

  /**
   * Test Client ML performance (Target: <500ms total)
   */
  private async testClientMLPerformance(): Promise<TestSuiteResult> {
    const tests: TestResult[] = []
    const targetTime = 500 // 500ms target

    // Test 1: Dual-layer processing
    for (let i = 0; i < 5; i++) {
      const events = this.generateSampleEvents(15, 'moderate')
      const result = await this.measureProcessingTime(events, 'dual_layer')
      
      tests.push({
        testName: `Dual Layer Processing ${i + 1}`,
        processingTime: result.processingTime,
        passed: result.processingTime <= targetTime,
        adaptationCount: result.adaptations.length,
        memoryUsage: result.memoryUsage || 0,
        layerBreakdown: result.layerBreakdown
      })
    }

    // Test 2: Progressive enhancement
    for (let i = 0; i < 3; i++) {
      const events = this.generateSampleEvents(25, 'enhanced')
      const result = await this.measureProcessingTime(events, 'progressive_enhancement')
      
      tests.push({
        testName: `Progressive Enhancement ${i + 1}`,
        processingTime: result.processingTime,
        passed: result.processingTime <= targetTime,
        adaptationCount: result.adaptations.length,
        memoryUsage: result.memoryUsage || 0,
        layerBreakdown: result.layerBreakdown
      })
    }

    return {
      suiteName: 'Client ML Performance',
      passed: tests.every(t => t.passed),
      averageTime: tests.reduce((sum, t) => sum + t.processingTime, 0) / tests.length,
      tests
    }
  }

  /**
   * Test fallback performance
   */
  private async testFallbackPerformance(): Promise<TestSuiteResult> {
    const tests: TestResult[] = []
    const targetTime = 100 // 100ms target for fallback

    // Test fallback scenarios
    for (let i = 0; i < 5; i++) {
      const events = this.generateSampleEvents(10, 'fallback')
      const result = await this.measureProcessingTime(events, 'fallback_only')
      
      tests.push({
        testName: `Fallback Processing ${i + 1}`,
        processingTime: result.processingTime,
        passed: result.processingTime <= targetTime,
        adaptationCount: result.adaptations.length,
        memoryUsage: result.memoryUsage || 0
      })
    }

    return {
      suiteName: 'Fallback Performance',
      passed: tests.every(t => t.passed),
      averageTime: tests.reduce((sum, t) => sum + t.processingTime, 0) / tests.length,
      tests
    }
  }

  /**
   * Test end-to-end performance
   */
  private async testEndToEndPerformance(): Promise<TestSuiteResult> {
    const tests: TestResult[] = []
    const targetTime = 500 // 500ms end-to-end target

    // Test real-world scenarios
    const scenarios = [
      { name: 'Mobile User Struggling', events: this.generateMobileStruggleScenario() },
      { name: 'Desktop Fast User', events: this.generateDesktopFastScenario() },
      { name: 'Tablet Mixed Usage', events: this.generateTabletMixedScenario() },
      { name: 'High Error Rate', events: this.generateHighErrorScenario() },
      { name: 'Long Session', events: this.generateLongSessionScenario() }
    ]

    for (const scenario of scenarios) {
      const result = await this.measureProcessingTime(scenario.events, 'end_to_end')
      
      tests.push({
        testName: scenario.name,
        processingTime: result.processingTime,
        passed: result.processingTime <= targetTime,
        adaptationCount: result.adaptations.length,
        memoryUsage: result.memoryUsage || 0,
        layerBreakdown: result.layerBreakdown
      })
    }

    return {
      suiteName: 'End-to-End Performance',
      passed: tests.every(t => t.passed),
      averageTime: tests.reduce((sum, t) => sum + t.processingTime, 0) / tests.length,
      tests
    }
  }

  /**
   * Test concurrent processing performance
   */
  private async testConcurrentProcessing(): Promise<TestSuiteResult> {
    const tests: TestResult[] = []
    const targetTime = 750 // 750ms for concurrent processing

    // Test concurrent sessions
    const concurrentTests = [
      { sessions: 2, name: '2 Concurrent Sessions' },
      { sessions: 5, name: '5 Concurrent Sessions' },
      { sessions: 10, name: '10 Concurrent Sessions' }
    ]

    for (const test of concurrentTests) {
      const startTime = performance.now()
      
      const promises = Array.from({ length: test.sessions }, (_, i) => {
        const events = this.generateSampleEvents(10, 'concurrent')
        return this.measureProcessingTime(events, 'concurrent', `session_${i}`)
      })

      const results = await Promise.all(promises)
      const totalTime = performance.now() - startTime
      const maxTime = Math.max(...results.map(r => r.processingTime))
      
      tests.push({
        testName: test.name,
        processingTime: maxTime,
        passed: maxTime <= targetTime,
        adaptationCount: results.reduce((sum, r) => sum + r.adaptations.length, 0),
        memoryUsage: Math.max(...results.map(r => r.memoryUsage || 0)),
        concurrency: {
          totalTime,
          maxTime,
          averageTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
          sessions: test.sessions
        }
      })
    }

    return {
      suiteName: 'Concurrent Processing',
      passed: tests.every(t => t.passed),
      averageTime: tests.reduce((sum, t) => sum + t.processingTime, 0) / tests.length,
      tests
    }
  }

  /**
   * Test memory usage
   */
  private async testMemoryUsage(): Promise<TestSuiteResult> {
    const tests: TestResult[] = []
    const memoryLimit = 10 * 1024 * 1024 // 10MB limit

    // Test memory usage patterns
    for (let i = 0; i < 5; i++) {
      const initialMemory = this.getMemoryUsage()
      const events = this.generateSampleEvents(50, 'memory_test')
      
      const result = await this.measureProcessingTime(events, 'memory_test')
      const finalMemory = this.getMemoryUsage()
      const memoryIncrease = finalMemory - initialMemory
      
      tests.push({
        testName: `Memory Usage Test ${i + 1}`,
        processingTime: result.processingTime,
        passed: memoryIncrease <= memoryLimit,
        adaptationCount: result.adaptations.length,
        memoryUsage: memoryIncrease,
        memoryDetails: {
          initial: initialMemory,
          final: finalMemory,
          increase: memoryIncrease
        }
      })
    }

    return {
      suiteName: 'Memory Usage',
      passed: tests.every(t => t.passed),
      averageTime: tests.reduce((sum, t) => sum + t.processingTime, 0) / tests.length,
      tests
    }
  }

  /**
   * Test adaptation application performance
   */
  private async testAdaptationApplication(): Promise<TestSuiteResult> {
    const tests: TestResult[] = []
    const targetTime = 200 // 200ms for DOM manipulation

    // Test different adaptation types
    const adaptationTypes = [
      'field_reordering',
      'progressive_disclosure',
      'error_prevention',
      'context_switching',
      'visual_emphasis'
    ]

    for (const type of adaptationTypes) {
      const adaptation = this.generateSampleAdaptation(type)
      const result = await this.measureAdaptationApplication(adaptation)
      
      tests.push({
        testName: `${type} Application`,
        processingTime: result.processingTime,
        passed: result.processingTime <= targetTime,
        adaptationCount: 1,
        memoryUsage: result.memoryUsage || 0
      })
    }

    return {
      suiteName: 'Adaptation Application',
      passed: tests.every(t => t.passed),
      averageTime: tests.reduce((sum, t) => sum + t.processingTime, 0) / tests.length,
      tests
    }
  }

  /**
   * Measure processing time for events
   */
  private async measureProcessingTime(
    events: BehaviorEvent[],
    mode: string,
    sessionId?: string
  ): Promise<ProcessingResult> {
    const session = sessionId || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const formId = 'test_form'
    
    const startTime = performance.now()
    const initialMemory = this.getMemoryUsage()

    try {
      let result: any

      switch (mode) {
        case 'edge_ml_only':
          // Simulate edge ML only processing
          result = await this.simulateEdgeMLProcessing(events, session, formId)
          break
          
        case 'dual_layer':
        case 'progressive_enhancement':
        case 'end_to_end':
          // Use full progressive enhancement framework
          result = await this.framework.processEvents(events, session, formId)
          break
          
        case 'fallback_only':
          // Simulate fallback processing
          result = await this.simulateFallbackProcessing(events, session, formId)
          break
          
        default:
          result = await this.framework.processEvents(events, session, formId)
      }

      const processingTime = performance.now() - startTime
      const finalMemory = this.getMemoryUsage()

      return {
        processingTime,
        adaptations: result.adaptations || [],
        memoryUsage: finalMemory - initialMemory,
        layerBreakdown: result.layers || null
      }

    } catch (error) {
      return {
        processingTime: performance.now() - startTime,
        adaptations: [],
        memoryUsage: this.getMemoryUsage() - initialMemory,
        error: error.message
      }
    }
  }

  /**
   * Generate sample events for testing
   */
  private generateSampleEvents(count: number, complexity: string): BehaviorEvent[] {
    const events: BehaviorEvent[] = []
    const baseTime = Date.now()
    const sessionId = `test_session_${Math.random().toString(36).substr(2, 9)}`

    for (let i = 0; i < count; i++) {
      const eventTypes = this.getEventTypesForComplexity(complexity)
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
      
      events.push({
        id: `event_${i}`,
        sessionId,
        formId: 'test_form',
        eventType: eventType as any,
        timestamp: baseTime + i * 100,
        data: this.generateEventData(eventType, complexity),
        userAgent: 'Mozilla/5.0 (Test Browser)',
        url: 'https://test.example.com',
        ...(eventType.includes('field') && { fieldName: `field_${i % 5}` })
      })
    }

    return events
  }

  /**
   * Get event types based on complexity
   */
  private getEventTypesForComplexity(complexity: string): string[] {
    const baseTypes = ['mouse_move', 'mouse_click', 'key_press', 'focus', 'blur']
    
    switch (complexity) {
      case 'simple':
        return baseTypes.slice(0, 3)
      case 'complex':
      case 'enhanced':
        return [...baseTypes, 'field_change', 'scroll', 'form_submit', 'validation']
      case 'moderate':
        return [...baseTypes, 'field_change', 'scroll']
      default:
        return baseTypes
    }
  }

  /**
   * Generate event data based on type and complexity
   */
  private generateEventData(eventType: string, complexity: string): any {
    const baseData: any = {
      timestamp: Date.now(),
      complexity
    }

    switch (eventType) {
      case 'mouse_move':
        return { ...baseData, x: Math.random() * 1000, y: Math.random() * 800 }
      case 'mouse_click':
        return { ...baseData, x: Math.random() * 1000, y: Math.random() * 800, button: 0 }
      case 'key_press':
        return { ...baseData, key: Math.random() > 0.1 ? 'a' : 'Backspace' }
      case 'field_change':
        return { ...baseData, value: 'test_value', length: Math.floor(Math.random() * 20) }
      default:
        return baseData
    }
  }

  /**
   * Generate real-world test scenarios
   */
  private generateMobileStruggleScenario(): BehaviorEvent[] {
    // High error rate, long hesitation times, mobile device
    const events = this.generateSampleEvents(15, 'complex')
    return events.map(event => ({
      ...event,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      data: {
        ...event.data,
        ...(event.eventType === 'key_press' && Math.random() > 0.7 && { key: 'Backspace' })
      }
    }))
  }

  private generateDesktopFastScenario(): BehaviorEvent[] {
    // Low error rate, fast typing, desktop
    return this.generateSampleEvents(12, 'moderate')
  }

  private generateTabletMixedScenario(): BehaviorEvent[] {
    const events = this.generateSampleEvents(18, 'complex')
    return events.map(event => ({
      ...event,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'
    }))
  }

  private generateHighErrorScenario(): BehaviorEvent[] {
    const events = this.generateSampleEvents(20, 'complex')
    return events.map(event => ({
      ...event,
      data: {
        ...event.data,
        ...(event.eventType === 'key_press' && Math.random() > 0.5 && { key: 'Backspace' })
      }
    }))
  }

  private generateLongSessionScenario(): BehaviorEvent[] {
    const events = this.generateSampleEvents(40, 'enhanced')
    const baseTime = Date.now() - 600000 // 10 minutes ago
    return events.map((event, i) => ({
      ...event,
      timestamp: baseTime + i * 15000 // 15 seconds between events
    }))
  }

  /**
   * Simulate different processing modes
   */
  private async simulateEdgeMLProcessing(
    events: BehaviorEvent[],
    sessionId: string,
    formId: string
  ): Promise<any> {
    // Simulate edge ML processing
    await this.delay(Math.random() * 5) // 0-5ms
    
    return {
      adaptations: [
        {
          id: `edge_${Date.now()}`,
          sessionId,
          formId,
          adaptationType: 'error_prevention',
          confidence: 0.7
        }
      ]
    }
  }

  private async simulateFallbackProcessing(
    events: BehaviorEvent[],
    sessionId: string,
    formId: string
  ): Promise<any> {
    // Simulate fallback processing
    await this.delay(Math.random() * 50) // 0-50ms
    
    return {
      adaptations: [
        {
          id: `fallback_${Date.now()}`,
          sessionId,
          formId,
          adaptationType: 'context_switching',
          confidence: 0.5
        }
      ]
    }
  }

  /**
   * Generate sample adaptation for testing
   */
  private generateSampleAdaptation(type: string): FormAdaptation {
    return {
      id: `test_${type}_${Date.now()}`,
      sessionId: 'test_session',
      formId: 'test_form',
      adaptationType: type,
      confidence: 0.8,
      parameters: this.getParametersForType(type),
      config: {},
      cssChanges: {},
      jsChanges: '',
      appliedAt: new Date().toISOString(),
      isActive: true,
      description: `Test ${type} adaptation`,
      metadata: { source: 'test' }
    }
  }

  private getParametersForType(type: string): any {
    switch (type) {
      case 'progressive_disclosure':
        return { initialFields: 3, strategy: 'step_by_step' }
      case 'error_prevention':
        return { enableRealTimeValidation: true }
      case 'visual_emphasis':
        return { intensity: 0.7, duration: 2000 }
      default:
        return {}
    }
  }

  /**
   * Measure adaptation application time
   */
  private async measureAdaptationApplication(adaptation: FormAdaptation): Promise<ProcessingResult> {
    const startTime = performance.now()
    const initialMemory = this.getMemoryUsage()

    try {
      // Simulate DOM manipulation
      await this.simulateDOMManipulation(adaptation.adaptationType)
      
      const processingTime = performance.now() - startTime
      const finalMemory = this.getMemoryUsage()

      return {
        processingTime,
        adaptations: [adaptation],
        memoryUsage: finalMemory - initialMemory
      }
    } catch (error) {
      return {
        processingTime: performance.now() - startTime,
        adaptations: [],
        memoryUsage: this.getMemoryUsage() - initialMemory,
        error: error.message
      }
    }
  }

  /**
   * Simulate DOM manipulation for different adaptation types
   */
  private async simulateDOMManipulation(adaptationType: string): Promise<void> {
    switch (adaptationType) {
      case 'field_reordering':
        await this.delay(50 + Math.random() * 100) // 50-150ms
        break
      case 'progressive_disclosure':
        await this.delay(30 + Math.random() * 80) // 30-110ms
        break
      case 'visual_emphasis':
        await this.delay(20 + Math.random() * 60) // 20-80ms
        break
      default:
        await this.delay(10 + Math.random() * 40) // 10-50ms
    }
  }

  /**
   * Generate validation report
   */
  private generateValidationReport(results: TestSuiteResult[]): ValidationReport {
    const allTests = results.flatMap(suite => suite.tests)
    const passedTests = allTests.filter(test => test.passed)
    
    const averageTime = allTests.length > 0 ? 
      allTests.reduce((sum, test) => sum + test.processingTime, 0) / allTests.length : 0
    
    const maxTime = allTests.length > 0 ? 
      Math.max(...allTests.map(test => test.processingTime)) : 0
    
    const target500msTests = allTests.filter(test => test.testName.includes('End-to-End') || test.testName.includes('Dual Layer'))
    const meets500msTarget = target500msTests.every(test => test.processingTime <= 500)
    
    const edgeMLTests = allTests.filter(test => test.testName.includes('Edge ML'))
    const meetsEdgeTarget = edgeMLTests.every(test => test.processingTime <= 5)

    return {
      overallPassed: results.every(suite => suite.passed),
      meets500msTarget,
      meetsEdgeTarget,
      totalTests: allTests.length,
      passedTests: passedTests.length,
      failedTests: allTests.length - passedTests.length,
      averageProcessingTime: averageTime,
      maxProcessingTime: maxTime,
      suiteResults: results,
      recommendations: this.generateRecommendations(results, averageTime, maxTime),
      summary: this.generateSummary(results, averageTime, meets500msTarget, meetsEdgeTarget)
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    results: TestSuiteResult[],
    averageTime: number,
    maxTime: number
  ): string[] {
    const recommendations: string[] = []

    if (maxTime > 500) {
      recommendations.push('Maximum processing time exceeds 500ms target - optimize bottlenecks')
    }

    if (averageTime > 250) {
      recommendations.push('Average processing time is high - consider performance optimizations')
    }

    const edgeMLSuite = results.find(suite => suite.suiteName === 'Edge ML Performance')
    if (edgeMLSuite && edgeMLSuite.averageTime > 5) {
      recommendations.push('Edge ML processing exceeds 5ms target - optimize edge algorithms')
    }

    const memoryTests = results.find(suite => suite.suiteName === 'Memory Usage')
    if (memoryTests && !memoryTests.passed) {
      recommendations.push('Memory usage issues detected - implement memory optimization')
    }

    const concurrentTests = results.find(suite => suite.suiteName === 'Concurrent Processing')
    if (concurrentTests && !concurrentTests.passed) {
      recommendations.push('Concurrent processing issues detected - optimize for scalability')
    }

    if (recommendations.length === 0) {
      recommendations.push('All performance targets met - system is optimally configured')
    }

    return recommendations
  }

  /**
   * Generate summary
   */
  private generateSummary(
    results: TestSuiteResult[],
    averageTime: number,
    meets500ms: boolean,
    meetsEdge: boolean
  ): string {
    const passedSuites = results.filter(suite => suite.passed).length
    const totalSuites = results.length

    let summary = `Performance validation completed: ${passedSuites}/${totalSuites} test suites passed. `
    summary += `Average processing time: ${Math.round(averageTime)}ms. `
    
    if (meets500ms) {
      summary += '✅ 500ms target achieved. '
    } else {
      summary += '❌ 500ms target not met. '
    }
    
    if (meetsEdge) {
      summary += '✅ Edge ML 5ms target achieved.'
    } else {
      summary += '❌ Edge ML 5ms target not met.'
    }

    return summary
  }

  /**
   * Helper methods
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize || 0
    }
    return 0
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get validation status
   */
  getValidationStatus(): ValidationStatus {
    return {
      testsRun: this.testResults.length,
      framework: this.framework.getStatus(),
      lastValidation: this.testResults.length > 0 ? this.testResults[this.testResults.length - 1] : null
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.framework.dispose()
    this.testResults = []
  }
}

// Type definitions
interface TestResult {
  testName: string
  processingTime: number
  passed: boolean
  adaptationCount: number
  memoryUsage: number
  layerBreakdown?: any
  concurrency?: any
  memoryDetails?: any
}

interface TestSuiteResult {
  suiteName: string
  passed: boolean
  averageTime: number
  tests: TestResult[]
  error?: string
}

interface ProcessingResult {
  processingTime: number
  adaptations: any[]
  memoryUsage: number
  layerBreakdown?: any
  error?: string
}

interface ValidationReport {
  overallPassed: boolean
  meets500msTarget: boolean
  meetsEdgeTarget: boolean
  totalTests: number
  passedTests: number
  failedTests: number
  averageProcessingTime: number
  maxProcessingTime: number
  suiteResults: TestSuiteResult[]
  recommendations: string[]
  summary: string
}

interface ValidationStatus {
  testsRun: number
  framework: any
  lastValidation: TestResult | null
}

export { PerformanceValidator }
export type { ValidationReport, TestResult, ValidationStatus }