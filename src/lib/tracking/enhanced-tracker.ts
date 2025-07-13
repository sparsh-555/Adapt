import { BehaviorEvent, AdaptConfig } from '@/types'
import { generateEventId, throttle, debounce } from '@/utils'
import { ClientMLEngine } from '@/lib/ml/client-ml'
import { ProgressiveEnhancementFramework } from '@/lib/enhancement/progressive-enhancement'

/**
 * Advanced behavior tracking with sophisticated pattern analysis
 * Phase 2: Enhanced tracking for dual-layer ML architecture
 */
export class EnhancedBehaviorTracker {
  private config: AdaptConfig
  private sessionId: string
  private events: BehaviorEvent[] = []
  private isTracking = false
  private eventHandlers: Map<string, EventListener> = new Map()
  private clientML: ClientMLEngine | null = null
  private enhancementFramework: ProgressiveEnhancementFramework

  // Advanced tracking state
  private typingMetrics: Map<string, TypingMetrics> = new Map()
  private mouseMetrics: MouseMetrics = new MouseMetrics()
  private fieldMetrics: Map<string, FieldMetrics> = new Map()
  private sessionMetrics: SessionMetrics = new SessionMetrics()
  private errorPatterns: ErrorPattern[] = []

  // Performance optimized handlers
  private debouncedSend: () => void
  private throttledMouseMove: EventListener
  private throttledScroll: EventListener

  constructor(config: AdaptConfig, sessionId: string) {
    this.config = config
    this.sessionId = sessionId

    // Initialize progressive enhancement framework
    this.enhancementFramework = new ProgressiveEnhancementFramework(config)

    // Initialize client-side ML for progressive enhancement
    if (typeof window !== 'undefined') {
      this.clientML = new ClientMLEngine({
        modelUrl: '/models/behavior-model.onnx',
        debugging: config.debugging
      })
    }

    // Create optimized handlers
    this.debouncedSend = debounce(this.sendEvents.bind(this), config.trackingOptions.debounceMs)
    this.throttledMouseMove = throttle(this.handleAdvancedMouseMove.bind(this), 50) // Higher frequency for precision
    this.throttledScroll = throttle(this.handleAdvancedScroll.bind(this), 100)
  }

  /**
   * Start enhanced behavior tracking
   */
  async startTracking(): Promise<void> {
    if (this.isTracking) return

    this.isTracking = true
    this.sessionMetrics.startTime = Date.now()

    // Initialize client-side ML in background
    if (this.clientML) {
      this.clientML.initialize().catch(error => {
        if (this.config.debugging) {
          console.log('Client ML initialization failed, continuing without enhancement:', error)
        }
      })
    }

    this.setupAdvancedEventListeners()

    // Track enhanced page load with device capabilities
    await this.trackEvent({
      sessionId: this.sessionId,
      formId: 'page',
      eventType: 'page_load' as any,
      timestamp: Date.now(),
      data: {
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          pixelRatio: window.devicePixelRatio || 1,
        },
        deviceCapabilities: this.getDeviceCapabilities(),
        performance: this.getPerformanceMetrics(),
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
    })

    if (this.config.debugging) {
      console.log('Enhanced behavior tracking started', {
        sessionId: this.sessionId,
        clientMLSupported: this.clientML?.isAvailable() || false
      })
    }
  }

  /**
   * Enhanced event tracking with pattern analysis
   */
  async trackEvent(event: Partial<BehaviorEvent>): Promise<void> {
    if (!this.isTracking) return

    const fullEvent: BehaviorEvent = {
      id: generateEventId(),
      sessionId: this.sessionId,
      formId: event.formId || 'unknown',
      eventType: event.eventType!,
      ...(event.fieldName && { fieldName: event.fieldName }),
      timestamp: event.timestamp || Date.now(),
      data: event.data || {},
      userAgent: event.userAgent || navigator.userAgent,
      url: event.url || window.location.href,
    }

    this.events.push(fullEvent)
    this.updatePatternAnalysis(fullEvent)

    if (this.config.debugging) {
      console.log('Enhanced tracked event:', fullEvent)
    }

    // Send critical events immediately
    if (this.isCriticalEvent(fullEvent) || this.events.length >= this.config.trackingOptions.batchSize) {
      await this.sendEvents()
    } else {
      this.debouncedSend()
    }
  }

  /**
   * Setup advanced event listeners with enhanced tracking
   */
  private setupAdvancedEventListeners(): void {
    // Enhanced mouse tracking
    if (this.config.trackingOptions.trackMouse) {
      const mouseMoveHandler = this.throttledMouseMove
      const clickHandler = this.handleAdvancedMouseClick.bind(this)
      const mouseDownHandler = this.handleMouseDown.bind(this)
      const mouseUpHandler = this.handleMouseUp.bind(this)
      
      document.addEventListener('mousemove', mouseMoveHandler)
      document.addEventListener('click', clickHandler)
      document.addEventListener('mousedown', mouseDownHandler)
      document.addEventListener('mouseup', mouseUpHandler)
      
      this.eventHandlers.set('mousemove', mouseMoveHandler)
      this.eventHandlers.set('click', clickHandler)
      this.eventHandlers.set('mousedown', mouseDownHandler)
      this.eventHandlers.set('mouseup', mouseUpHandler)
    }

    // Enhanced keyboard tracking
    if (this.config.trackingOptions.trackKeyboard) {
      const keyDownHandler = this.handleAdvancedKeyDown.bind(this)
      const keyUpHandler = this.handleAdvancedKeyUp.bind(this)
      const keyPressHandler = this.handleAdvancedKeyPress.bind(this)
      
      document.addEventListener('keydown', keyDownHandler)
      document.addEventListener('keyup', keyUpHandler)
      document.addEventListener('keypress', keyPressHandler)
      
      this.eventHandlers.set('keydown', keyDownHandler)
      this.eventHandlers.set('keyup', keyUpHandler)
      this.eventHandlers.set('keypress', keyPressHandler)
    }

    // Enhanced scroll tracking
    if (this.config.trackingOptions.trackScroll) {
      const scrollHandler = this.throttledScroll
      window.addEventListener('scroll', scrollHandler, { passive: true })
      this.eventHandlers.set('scroll', scrollHandler)
    }

    // Advanced form tracking
    this.setupAdvancedFormTracking()

    // Viewport and focus tracking
    this.setupViewportTracking()
  }

  /**
   * Advanced mouse movement tracking with precision analysis
   */
  private handleAdvancedMouseMove(event: MouseEvent): void {
    const currentTime = Date.now()
    const mouseData = {
      x: event.clientX,
      y: event.clientY,
      timestamp: currentTime,
      target: (event.target as Element)?.tagName.toLowerCase()
    }

    // Calculate movement metrics
    if (this.mouseMetrics.lastPosition) {
      const deltaX = mouseData.x - this.mouseMetrics.lastPosition.x
      const deltaY = mouseData.y - this.mouseMetrics.lastPosition.y
      const deltaTime = currentTime - this.mouseMetrics.lastPosition.timestamp
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const velocity = deltaTime > 0 ? distance / deltaTime : 0
      
      // Update mouse metrics
      this.mouseMetrics.updateMetrics(velocity, distance, deltaTime)

      // Track advanced mouse data
      this.trackEvent({
        formId: this.getFormIdFromTarget(event.target as Element),
        eventType: 'mouse_move',
        data: {
          ...mouseData,
          velocity,
          distance,
          acceleration: this.mouseMetrics.getAcceleration(),
          precision: this.mouseMetrics.getPrecisionScore(),
          movement_pattern: this.mouseMetrics.getMovementPattern(),
          hesitation_detected: velocity < 0.1 && this.mouseMetrics.lastVelocity > 0.5,
        },
      })
    }

    this.mouseMetrics.lastPosition = mouseData
    this.mouseMetrics.lastVelocity = this.mouseMetrics.currentVelocity
  }

  /**
   * Advanced mouse click tracking with timing analysis
   */
  private handleAdvancedMouseClick(event: MouseEvent): void {
    const currentTime = Date.now()
    const clickData = {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      target: (event.target as Element)?.tagName.toLowerCase(),
      timestamp: currentTime
    }

    // Calculate click patterns
    const timeSinceLastClick = this.mouseMetrics.lastClickTime 
      ? currentTime - this.mouseMetrics.lastClickTime 
      : 0

    this.trackEvent({
      formId: this.getFormIdFromTarget(event.target as Element),
      eventType: 'mouse_click',
      data: {
        ...clickData,
        click_interval: timeSinceLastClick,
        double_click_detected: timeSinceLastClick < 500,
        click_precision: this.calculateClickPrecision(event.target as Element),
        mouse_path_complexity: this.mouseMetrics.getPathComplexity(),
      },
    })

    this.mouseMetrics.lastClickTime = currentTime
  }

  /**
   * Advanced keyboard tracking with typing pattern analysis
   */
  private handleAdvancedKeyDown(event: KeyboardEvent): void {
    const fieldName = this.getFieldNameFromTarget(event.target as Element)
    const currentTime = Date.now()

    if (fieldName) {
      const metrics = this.getOrCreateTypingMetrics(fieldName)
      metrics.recordKeyDown(event.key, currentTime)

      this.trackEvent({
        formId: this.getFormIdFromTarget(event.target as Element),
        eventType: 'key_press',
        fieldName,
        data: {
          key: event.key,
          keyCode: event.keyCode,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          timestamp: currentTime,
          // Advanced typing metrics
          typing_speed: metrics.getTypingSpeed(),
          key_interval: metrics.getLastKeyInterval(),
          rhythm_consistency: metrics.getRhythmConsistency(),
          error_correction_ratio: metrics.getErrorCorrectionRatio(),
          hesitation_pattern: metrics.getHesitationPattern(),
          typing_confidence: metrics.getConfidenceScore(),
        },
      })

      // Detect error patterns
      if (event.key === 'Backspace') {
        this.recordErrorPattern(fieldName, 'backspace', currentTime)
      }
    }
  }

  /**
   * Advanced key up tracking for dwell time analysis
   */
  private handleAdvancedKeyUp(event: KeyboardEvent): void {
    const fieldName = this.getFieldNameFromTarget(event.target as Element)
    const currentTime = Date.now()

    if (fieldName) {
      const metrics = this.getOrCreateTypingMetrics(fieldName)
      const dwellTime = metrics.recordKeyUp(event.key, currentTime)

      // Track dwell time for key pressure analysis
      this.trackEvent({
        formId: this.getFormIdFromTarget(event.target as Element),
        eventType: 'key_dwell',
        fieldName,
        data: {
          key: event.key,
          dwell_time: dwellTime,
          pressure_intensity: this.calculateKeyPressure(dwellTime),
          typing_stress_level: metrics.getStressLevel(),
        },
      })
    }
  }

  /**
   * Advanced form tracking with field-level analysis
   */
  private setupAdvancedFormTracking(): void {
    const forms = document.querySelectorAll(this.config.formSelector || 'form')
    
    forms.forEach(form => {
      const formId = (form as HTMLElement).id || 
                    (form as HTMLElement).dataset.formId || 
                    `form-${Date.now()}`
      
      // Enhanced field tracking
      const fields = form.querySelectorAll('input, textarea, select')
      fields.forEach(field => {
        const fieldElement = field as HTMLInputElement
        const fieldName = fieldElement.name || fieldElement.id || 'unnamed'
        
        // Create field metrics
        this.fieldMetrics.set(fieldName, new FieldMetrics(fieldName, fieldElement.type))
        
        // Enhanced focus tracking
        const focusHandler = (event: Event) => this.handleAdvancedFieldFocus(event, formId, fieldName)
        fieldElement.addEventListener('focus', focusHandler)
        this.eventHandlers.set(`focus-${formId}-${fieldName}`, focusHandler)
        
        // Enhanced blur tracking
        const blurHandler = (event: Event) => this.handleAdvancedFieldBlur(event, formId, fieldName)
        fieldElement.addEventListener('blur', blurHandler)
        this.eventHandlers.set(`blur-${formId}-${fieldName}`, blurHandler)
        
        // Enhanced input tracking
        const inputHandler = (event: Event) => this.handleAdvancedFieldInput(event, formId, fieldName)
        fieldElement.addEventListener('input', inputHandler)
        this.eventHandlers.set(`input-${formId}-${fieldName}`, inputHandler)

        // Validation tracking
        const invalidHandler = (event: Event) => this.handleFieldValidation(event, formId, fieldName, false)
        fieldElement.addEventListener('invalid', invalidHandler)
        this.eventHandlers.set(`invalid-${formId}-${fieldName}`, invalidHandler)
      })
    })
  }

  /**
   * Enhanced field focus with attention analysis
   */
  private handleAdvancedFieldFocus(event: Event, formId: string, fieldName: string): void {
    const target = event.target as HTMLInputElement
    const currentTime = Date.now()
    const fieldMetrics = this.fieldMetrics.get(fieldName)
    
    if (fieldMetrics) {
      fieldMetrics.recordFocus(currentTime)
      
      this.trackEvent({
        formId,
        eventType: 'focus',
        fieldName,
        data: {
          fieldType: target.type,
          required: target.required,
          focusTime: currentTime,
          // Enhanced focus metrics
          focus_sequence: fieldMetrics.getFocusSequence(),
          attention_pattern: fieldMetrics.getAttentionPattern(),
          field_complexity: this.calculateFieldComplexity(target),
          previous_field_completion: this.sessionMetrics.getLastFieldCompletion(),
          session_focus_count: fieldMetrics.focusCount,
        },
      })
    }
  }

  /**
   * Enhanced field blur with completion analysis
   */
  private handleAdvancedFieldBlur(event: Event, formId: string, fieldName: string): void {
    const target = event.target as HTMLInputElement
    const currentTime = Date.now()
    const fieldMetrics = this.fieldMetrics.get(fieldName)
    
    if (fieldMetrics) {
      const focusDuration = fieldMetrics.recordBlur(currentTime)
      const completionQuality = this.assessFieldCompletion(target)
      
      this.trackEvent({
        formId,
        eventType: 'blur',
        fieldName,
        data: {
          fieldType: target.type,
          hasValue: !!target.value,
          valueLength: target.value?.length || 0,
          blurTime: currentTime,
          // Enhanced blur metrics
          focus_duration: focusDuration,
          completion_quality: completionQuality,
          abandonment_risk: fieldMetrics.getAbandonmentRisk(),
          interaction_efficiency: fieldMetrics.getInteractionEfficiency(),
          validation_attempts: fieldMetrics.validationAttempts,
        },
      })

      this.sessionMetrics.recordFieldCompletion(fieldName, completionQuality)
    }
  }

  /**
   * Setup viewport and attention tracking
   */
  private setupViewportTracking(): void {
    // Visibility change tracking
    const visibilityHandler = () => {
      this.trackEvent({
        formId: 'page',
        eventType: 'visibility_change' as any,
        data: {
          hidden: document.hidden,
          visibilityState: document.visibilityState,
          timestamp: Date.now(),
        },
      })
    }
    document.addEventListener('visibilitychange', visibilityHandler)
    this.eventHandlers.set('visibilitychange', visibilityHandler)

    // Window focus/blur tracking
    const windowFocusHandler = () => {
      this.trackEvent({
        formId: 'page',
        eventType: 'window_focus' as any,
        data: { focused: true, timestamp: Date.now() },
      })
    }
    const windowBlurHandler = () => {
      this.trackEvent({
        formId: 'page',
        eventType: 'window_blur' as any,
        data: { focused: false, timestamp: Date.now() },
      })
    }
    window.addEventListener('focus', windowFocusHandler)
    window.addEventListener('blur', windowBlurHandler)
    this.eventHandlers.set('windowfocus', windowFocusHandler)
    this.eventHandlers.set('windowblur', windowBlurHandler)
  }

  // Helper methods for advanced analysis
  private getOrCreateTypingMetrics(fieldName: string): TypingMetrics {
    if (!this.typingMetrics.has(fieldName)) {
      this.typingMetrics.set(fieldName, new TypingMetrics())
    }
    return this.typingMetrics.get(fieldName)!
  }

  private calculateClickPrecision(target: Element): number {
    const rect = target.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Calculate how close the click was to the center
    if (this.mouseMetrics.lastPosition) {
      const deltaX = Math.abs(this.mouseMetrics.lastPosition.x - centerX)
      const deltaY = Math.abs(this.mouseMetrics.lastPosition.y - centerY)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const maxDistance = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2
      
      return Math.max(0, 1 - distance / maxDistance)
    }
    
    return 0.5 // Default precision
  }

  private calculateKeyPressure(dwellTime: number): number {
    // Longer dwell time might indicate more force/stress
    // Normal typing: 80-120ms, stressed: 150ms+
    return Math.min(dwellTime / 200, 1)
  }

  private calculateFieldComplexity(field: HTMLInputElement): number {
    let complexity = 0.5 // Base complexity
    
    // Increase complexity based on field attributes
    if (field.required) complexity += 0.2
    if (field.pattern) complexity += 0.3
    if (field.type === 'email') complexity += 0.1
    if (field.type === 'password') complexity += 0.2
    if (field.type === 'tel') complexity += 0.15
    
    return Math.min(complexity, 1)
  }

  private assessFieldCompletion(field: HTMLInputElement): number {
    if (!field.value) return 0
    
    let quality = 0.5 // Base quality for having a value
    
    // Assess based on field type and validation
    if (field.checkValidity()) quality += 0.4
    if (field.value.length >= (field.minLength || 1)) quality += 0.1
    
    return Math.min(quality, 1)
  }

  private recordErrorPattern(fieldName: string, errorType: string, timestamp: number): void {
    this.errorPatterns.push({
      fieldName,
      errorType,
      timestamp,
      context: this.getErrorContext(fieldName)
    })
    
    // Keep only recent error patterns (last 5 minutes)
    const fiveMinutesAgo = timestamp - 300000
    this.errorPatterns = this.errorPatterns.filter(error => error.timestamp > fiveMinutesAgo)
  }

  private getErrorContext(fieldName: string): any {
    const fieldMetrics = this.fieldMetrics.get(fieldName)
    return {
      focusCount: fieldMetrics?.focusCount || 0,
      typingSpeed: this.typingMetrics.get(fieldName)?.getTypingSpeed() || 0,
      sessionDuration: Date.now() - this.sessionMetrics.startTime
    }
  }

  private getDeviceCapabilities(): any {
    return {
      touchSupported: 'ontouchstart' in window,
      pointerSupported: 'onpointerdown' in window,
      deviceMemory: (navigator as any).deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      connection: this.getConnectionInfo(),
    }
  }

  private getConnectionInfo(): any {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      }
    }
    return null
  }

  private getPerformanceMetrics(): any {
    if (typeof performance !== 'undefined') {
      const timing = performance.timing
      return {
        pageLoadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType?.('paint')?.[0]?.startTime || null
      }
    }
    return null
  }

  private isCriticalEvent(event: BehaviorEvent): boolean {
    return ['form_submit', 'page_unload', 'window_blur'].includes(event.eventType)
  }

  private updatePatternAnalysis(event: BehaviorEvent): void {
    // Update session metrics with each event
    this.sessionMetrics.recordEvent(event)

    // Advanced pattern analysis could be added here
    // This would feed into the client-side ML enhancement
  }

  private getFormIdFromTarget(target: Element | null): string {
    if (!target) return 'unknown'
    
    const form = target.closest('form')
    return form?.id || form?.dataset.formId || 'unknown'
  }

  private getFieldNameFromTarget(target: Element | null): string {
    if (!target) return ''
    
    const element = target as HTMLInputElement
    return element.name || element.id || ''
  }

  // Send events with progressive enhancement framework
  private async sendEvents(): Promise<void> {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      // Process events through progressive enhancement framework
      const formIds = [...new Set(eventsToSend.map(e => e.formId))]
      
      for (const formId of formIds) {
        const formEvents = eventsToSend.filter(e => e.formId === formId)
        
        // Use progressive enhancement framework
        const result = await this.enhancementFramework.processEvents(
          formEvents,
          this.sessionId,
          formId
        )

        if (result.success && result.adaptations.length > 0) {
          // Apply adaptations through the existing system
          await this.applyAdaptationsWithEnhancement(result.adaptations)
        }

        if (this.config.debugging) {
          console.log('Progressive enhancement completed:', {
            formId,
            eventCount: formEvents.length,
            adaptationCount: result.adaptations.length,
            processingTime: `${Math.round(result.processingTime)}ms`,
            edgeMLTime: `${Math.round(result.layers.edge.time)}ms`,
            clientMLTime: `${Math.round(result.layers.client.time)}ms`,
            fallbackUsed: result.fallbackUsed,
            performanceMetrics: result.performanceMetrics
          })
        }
      }

    } catch (error) {
      console.error('Failed to process enhanced events:', error)
      
      // Fallback to basic tracking API if progressive enhancement fails
      try {
        await this.sendEventsBasic(eventsToSend)
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        // Re-add events to retry later
        this.events.unshift(...eventsToSend)
      }
    }
  }

  // Fallback method for basic event sending
  private async sendEventsBasic(eventsToSend: BehaviorEvent[]): Promise<void> {
    const enhancedPayload = {
      events: eventsToSend,
      sessionMetrics: this.sessionMetrics.getMetrics(),
      clientMLCapabilities: this.clientML?.getCapabilities() || null,
      advancedAnalytics: this.getAdvancedAnalytics(),
    }

    const response = await fetch(`${this.config.apiUrl}/api/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedPayload),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    
    if (result.adaptations && result.adaptations.length > 0) {
      await this.applyAdaptationsWithEnhancement(result.adaptations)
    }
  }

  private async applyAdaptationsWithEnhancement(adaptations: any[]): Promise<void> {
    for (const adaptation of adaptations) {
      // Check if client-side ML enhancement is requested
      if (adaptation.parameters?.enhanceWithClientML && this.clientML?.isAvailable()) {
        try {
          const edgeFeatures = adaptation.parameters.mlFeatures
          const enhancedAdaptations = await this.clientML.enhanceAdaptations(edgeFeatures, [adaptation])
          
          if (enhancedAdaptations.length > 0) {
            if (this.config.debugging) {
              console.log('Client ML enhanced adaptation:', enhancedAdaptations[0])
            }
            // Apply enhanced adaptation (would integrate with DOMAdapter)
          }
        } catch (error) {
          if (this.config.debugging) {
            console.log('Client ML enhancement failed, using edge adaptation:', error)
          }
          // Fall back to edge adaptation
        }
      }
    }
  }

  private getAdvancedAnalytics(): any {
    return {
      mouseMetrics: this.mouseMetrics.getMetrics(),
      typingMetrics: this.getTypingMetricsSnapshot(),
      fieldMetrics: this.getFieldMetricsSnapshot(),
      errorPatterns: this.errorPatterns.slice(-10), // Last 10 errors
      sessionDuration: Date.now() - this.sessionMetrics.startTime,
    }
  }

  private getTypingMetricsSnapshot(): any {
    const snapshot: any = {}
    this.typingMetrics.forEach((metrics, fieldName) => {
      snapshot[fieldName] = metrics.getSnapshot()
    })
    return snapshot
  }

  private getFieldMetricsSnapshot(): any {
    const snapshot: any = {}
    this.fieldMetrics.forEach((metrics, fieldName) => {
      snapshot[fieldName] = metrics.getSnapshot()
    })
    return snapshot
  }

  // Additional handler methods would be implemented here...
  private handleAdvancedKeyPress(event: KeyboardEvent): void {
    // Implementation similar to handleAdvancedKeyDown but for keypress
  }

  private handleMouseDown(event: MouseEvent): void {
    // Track mouse down events for click timing analysis
  }

  private handleMouseUp(event: MouseEvent): void {
    // Track mouse up events for click duration analysis
  }

  private handleAdvancedScroll(): void {
    // Enhanced scroll tracking with velocity and acceleration
  }

  private handleAdvancedFieldInput(event: Event, formId: string, fieldName: string): void {
    // Enhanced input tracking with real-time validation
  }

  private handleFieldValidation(event: Event, formId: string, fieldName: string, isValid: boolean): void {
    // Track validation events and patterns
  }

  /**
   * Stop enhanced tracking and cleanup
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) return

    this.isTracking = false
    
    // Remove all event listeners
    this.eventHandlers.forEach((handler, eventKey) => {
      const [eventType] = eventKey.split('-')
      if (eventType) {
        if (['mousemove', 'click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'keypress'].includes(eventType)) {
          document.removeEventListener(eventType, handler)
        } else if (eventType === 'scroll') {
          window.removeEventListener(eventType, handler)
        } else if (eventType === 'visibilitychange') {
          document.removeEventListener(eventType, handler)
        } else if (['windowfocus', 'windowblur'].includes(eventType)) {
          window.removeEventListener(eventType.replace('window', ''), handler)
        }
      }
    })
    
    this.eventHandlers.clear()

    // Send final events
    if (this.events.length > 0) {
      await this.sendEvents()
    }

    // Cleanup client ML
    if (this.clientML) {
      this.clientML.dispose()
    }

    // Cleanup progressive enhancement framework
    this.enhancementFramework.dispose()

    if (this.config.debugging) {
      console.log('Enhanced behavior tracking stopped')
    }
  }
}

// Supporting classes for advanced metrics

class TypingMetrics {
  private keyIntervals: number[] = []
  private errorCount = 0
  private totalKeys = 0
  private keyDownTimes: Map<string, number> = new Map()
  private lastKeyTime = 0

  recordKeyDown(key: string, timestamp: number): void {
    if (this.lastKeyTime > 0) {
      const interval = timestamp - this.lastKeyTime
      this.keyIntervals.push(interval)
      if (this.keyIntervals.length > 20) {
        this.keyIntervals.shift() // Keep only recent intervals
      }
    }
    
    this.keyDownTimes.set(key, timestamp)
    this.lastKeyTime = timestamp
    this.totalKeys++
    
    if (key === 'Backspace') {
      this.errorCount++
    }
  }

  recordKeyUp(key: string, timestamp: number): number {
    const downTime = this.keyDownTimes.get(key)
    if (downTime) {
      const dwellTime = timestamp - downTime
      this.keyDownTimes.delete(key)
      return dwellTime
    }
    return 0
  }

  getTypingSpeed(): number {
    if (this.keyIntervals.length < 2) return 0
    const avgInterval = this.keyIntervals.reduce((a, b) => a + b, 0) / this.keyIntervals.length
    return avgInterval > 0 ? 60000 / avgInterval : 0 // Keys per minute
  }

  getLastKeyInterval(): number {
    return this.keyIntervals[this.keyIntervals.length - 1] || 0
  }

  getRhythmConsistency(): number {
    if (this.keyIntervals.length < 3) return 0.5
    
    const mean = this.keyIntervals.reduce((a, b) => a + b, 0) / this.keyIntervals.length
    const variance = this.keyIntervals.reduce((acc, interval) => acc + Math.pow(interval - mean, 2), 0) / this.keyIntervals.length
    const stdDev = Math.sqrt(variance)
    
    // Lower standard deviation = higher consistency
    return Math.max(0, 1 - stdDev / mean)
  }

  getErrorCorrectionRatio(): number {
    return this.totalKeys > 0 ? this.errorCount / this.totalKeys : 0
  }

  getHesitationPattern(): number {
    const longPauses = this.keyIntervals.filter(interval => interval > 2000).length
    return this.keyIntervals.length > 0 ? longPauses / this.keyIntervals.length : 0
  }

  getConfidenceScore(): number {
    const speed = Math.min(this.getTypingSpeed() / 60, 1) // Normalize to 60 WPM
    const rhythm = this.getRhythmConsistency()
    const accuracy = 1 - this.getErrorCorrectionRatio()
    
    return (speed * 0.3 + rhythm * 0.4 + accuracy * 0.3)
  }

  getStressLevel(): number {
    const errorRatio = this.getErrorCorrectionRatio()
    const hesitation = this.getHesitationPattern()
    const inconsistency = 1 - this.getRhythmConsistency()
    
    return (errorRatio * 0.4 + hesitation * 0.3 + inconsistency * 0.3)
  }

  getSnapshot(): any {
    return {
      typingSpeed: this.getTypingSpeed(),
      rhythmConsistency: this.getRhythmConsistency(),
      errorCorrectionRatio: this.getErrorCorrectionRatio(),
      hesitationPattern: this.getHesitationPattern(),
      confidenceScore: this.getConfidenceScore(),
      stressLevel: this.getStressLevel(),
      totalKeys: this.totalKeys,
      errorCount: this.errorCount,
    }
  }
}

class MouseMetrics {
  lastPosition: { x: number; y: number; timestamp: number } | null = null
  lastVelocity = 0
  currentVelocity = 0
  lastClickTime = 0
  velocities: number[] = []
  distances: number[] = []
  path: { x: number; y: number; timestamp: number }[] = []

  updateMetrics(velocity: number, distance: number, deltaTime: number): void {
    this.currentVelocity = velocity
    this.velocities.push(velocity)
    this.distances.push(distance)
    
    if (this.lastPosition) {
      this.path.push({ ...this.lastPosition })
    }
    
    // Keep only recent data
    if (this.velocities.length > 50) {
      this.velocities.shift()
      this.distances.shift()
    }
    if (this.path.length > 100) {
      this.path.shift()
    }
  }

  getAcceleration(): number {
    return this.lastVelocity > 0 ? (this.currentVelocity - this.lastVelocity) / this.lastVelocity : 0
  }

  getPrecisionScore(): number {
    if (this.velocities.length < 5) return 0.5
    
    const avgVelocity = this.velocities.reduce((a, b) => a + b, 0) / this.velocities.length
    const smoothness = this.calculateSmoothness()
    
    // Higher precision = lower average velocity + higher smoothness
    return (1 - Math.min(avgVelocity / 10, 1)) * 0.6 + smoothness * 0.4
  }

  getMovementPattern(): string {
    if (this.velocities.length < 10) return 'insufficient_data'
    
    const avgVelocity = this.velocities.reduce((a, b) => a + b, 0) / this.velocities.length
    const recentVelocities = this.velocities.slice(-5)
    const recentAvg = recentVelocities.reduce((a, b) => a + b, 0) / recentVelocities.length
    
    if (avgVelocity < 1) return 'hesitant'
    if (avgVelocity > 5) return 'rapid'
    if (Math.abs(avgVelocity - recentAvg) < 0.5) return 'steady'
    if (recentAvg > avgVelocity) return 'accelerating'
    return 'decelerating'
  }

  getPathComplexity(): number {
    if (this.path.length < 10) return 0
    
    let totalAngleChange = 0
    let segments = 0
    
    for (let i = 2; i < this.path.length; i++) {
      const p1 = this.path[i - 2]
      const p2 = this.path[i - 1]
      const p3 = this.path[i]
      
      const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x)
      const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x)
      
      const angleChange = Math.abs(angle2 - angle1)
      totalAngleChange += angleChange
      segments++
    }
    
    return segments > 0 ? totalAngleChange / segments : 0
  }

  private calculateSmoothness(): number {
    if (this.velocities.length < 5) return 0.5
    
    let variations = 0
    for (let i = 1; i < this.velocities.length; i++) {
      variations += Math.abs(this.velocities[i] - this.velocities[i - 1])
    }
    
    const avgVariation = variations / (this.velocities.length - 1)
    const avgVelocity = this.velocities.reduce((a, b) => a + b, 0) / this.velocities.length
    
    return avgVelocity > 0 ? Math.max(0, 1 - avgVariation / avgVelocity) : 0.5
  }

  getMetrics(): any {
    return {
      precision: this.getPrecisionScore(),
      movementPattern: this.getMovementPattern(),
      pathComplexity: this.getPathComplexity(),
      averageVelocity: this.velocities.length > 0 ? this.velocities.reduce((a, b) => a + b, 0) / this.velocities.length : 0,
      currentVelocity: this.currentVelocity,
      acceleration: this.getAcceleration(),
    }
  }
}

class FieldMetrics {
  fieldName: string
  fieldType: string
  focusCount = 0
  totalFocusTime = 0
  validationAttempts = 0
  focusStartTime = 0
  focusSequence: number[] = []

  constructor(fieldName: string, fieldType: string) {
    this.fieldName = fieldName
    this.fieldType = fieldType
  }

  recordFocus(timestamp: number): void {
    this.focusCount++
    this.focusStartTime = timestamp
    this.focusSequence.push(timestamp)
  }

  recordBlur(timestamp: number): number {
    if (this.focusStartTime > 0) {
      const duration = timestamp - this.focusStartTime
      this.totalFocusTime += duration
      this.focusStartTime = 0
      return duration
    }
    return 0
  }

  getFocusSequence(): number[] {
    return [...this.focusSequence]
  }

  getAttentionPattern(): string {
    if (this.focusCount === 0) return 'no_interaction'
    if (this.focusCount === 1) return 'single_focus'
    if (this.focusCount <= 3) return 'normal_attention'
    return 'high_attention'
  }

  getAbandonmentRisk(): number {
    const avgFocusTime = this.focusCount > 0 ? this.totalFocusTime / this.focusCount : 0
    
    // Risk factors
    let risk = 0
    if (this.focusCount > 5) risk += 0.3 // Too many focuses
    if (avgFocusTime < 1000) risk += 0.2 // Very short focuses
    if (avgFocusTime > 30000) risk += 0.4 // Very long focuses
    if (this.validationAttempts > 2) risk += 0.3 // Multiple validation failures
    
    return Math.min(risk, 1)
  }

  getInteractionEfficiency(): number {
    if (this.focusCount === 0) return 0
    
    const avgFocusTime = this.totalFocusTime / this.focusCount
    const idealTime = 5000 // 5 seconds ideal focus time
    
    // Efficiency decreases with too many focuses or very long/short times
    const timeEfficiency = 1 - Math.abs(avgFocusTime - idealTime) / idealTime
    const focusEfficiency = Math.max(0, 1 - (this.focusCount - 1) * 0.2)
    
    return Math.max(0, (timeEfficiency + focusEfficiency) / 2)
  }

  getSnapshot(): any {
    return {
      focusCount: this.focusCount,
      totalFocusTime: this.totalFocusTime,
      averageFocusTime: this.focusCount > 0 ? this.totalFocusTime / this.focusCount : 0,
      attentionPattern: this.getAttentionPattern(),
      abandonmentRisk: this.getAbandonmentRisk(),
      interactionEfficiency: this.getInteractionEfficiency(),
      validationAttempts: this.validationAttempts,
    }
  }
}

class SessionMetrics {
  startTime = 0
  eventCount = 0
  fieldCompletions: Map<string, number> = new Map()
  lastFieldCompletion: string | null = null

  recordEvent(event: BehaviorEvent): void {
    this.eventCount++
  }

  recordFieldCompletion(fieldName: string, quality: number): void {
    this.fieldCompletions.set(fieldName, quality)
    this.lastFieldCompletion = fieldName
  }

  getLastFieldCompletion(): string | null {
    return this.lastFieldCompletion
  }

  getMetrics(): any {
    return {
      sessionDuration: Date.now() - this.startTime,
      eventCount: this.eventCount,
      fieldCompletionCount: this.fieldCompletions.size,
      averageCompletionQuality: this.getAverageCompletionQuality(),
    }
  }

  private getAverageCompletionQuality(): number {
    if (this.fieldCompletions.size === 0) return 0
    
    const total = Array.from(this.fieldCompletions.values()).reduce((a, b) => a + b, 0)
    return total / this.fieldCompletions.size
  }
}

interface ErrorPattern {
  fieldName: string
  errorType: string
  timestamp: number
  context: any
}

export default EnhancedBehaviorTracker