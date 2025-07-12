import { 
  BehaviorEvent, 
  FormAdaptation, 
  AdaptConfig, 
  AdaptClient, 
  EventHandler,
  AdaptError
} from '@/types'
import { 
  generateSessionId, 
  generateEventId, 
  debounce, 
  throttle,
  findFormElements,
  getFormFields,
  getFieldInfo,
  createAdaptError,
  isSSR
} from '@/utils'

/**
 * Main Adapt client class for behavior tracking and form optimization
 */
export class AdaptClientImpl implements AdaptClient {
  private config: AdaptConfig | null = null
  private tracker: BehaviorTracker | null = null
  private adapter: DOMAdapter | null = null
  private isInitialized = false
  private sessionId: string

  constructor() {
    this.sessionId = this.getOrCreateSessionId()
  }

  /**
   * Initialize the Adapt client with configuration
   */
  async init(config: AdaptConfig): Promise<void> {
    if (isSSR()) {
      throw createAdaptError('Adapt cannot be initialized on server-side', 'SSR_ERROR')
    }

    if (this.isInitialized) {
      console.warn('Adapt client is already initialized')
      return
    }

    this.config = {
      trackingOptions: {
        trackMouse: true,
        trackKeyboard: true,
        trackScroll: true,
        debounceMs: 100,
        batchSize: 10,
        enableProfiling: false,
        ...config.trackingOptions,
      },
      adaptationOptions: {
        enableFieldReordering: true,
        enableProgressiveDisclosure: true,
        enableContextSwitching: true,
        enableErrorPrevention: true,
        confidenceThreshold: 0.3,
        maxAdaptationsPerSession: 10,
        ...config.adaptationOptions,
      },
      ...config,
    }

    this.tracker = new BehaviorTracker(this.config, this.sessionId)
    this.adapter = new DOMAdapter(this.config)

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true })
      })
    }

    await this.tracker.startTracking()
    this.isInitialized = true

    if (this.config.debugging) {
      console.log('Adapt client initialized', { 
        sessionId: this.sessionId, 
        config: this.config 
      })
    }
  }

  /**
   * Track a custom behavior event
   */
  async track(event: BehaviorEvent): Promise<void> {
    if (!this.tracker) {
      throw createAdaptError('Adapt client not initialized', 'NOT_INITIALIZED')
    }

    await this.tracker.trackEvent(event)
  }

  /**
   * Apply a form adaptation
   */
  async apply(adaptation: FormAdaptation): Promise<void> {
    if (!this.adapter) {
      throw createAdaptError('Adapt client not initialized', 'NOT_INITIALIZED')
    }

    await this.adapter.applyAdaptation(adaptation)
  }

  /**
   * Destroy the client and clean up resources
   */
  async destroy(): Promise<void> {
    if (this.tracker) {
      await this.tracker.stopTracking()
      this.tracker = null
    }

    if (this.adapter) {
      this.adapter.destroy()
      this.adapter = null
    }

    this.isInitialized = false
    this.config = null
  }

  /**
   * Get or create session ID
   */
  private getOrCreateSessionId(): string {
    if (isSSR()) return generateSessionId()

    try {
      let sessionId = sessionStorage.getItem('adapt-session-id')
      if (!sessionId) {
        sessionId = generateSessionId()
        sessionStorage.setItem('adapt-session-id', sessionId)
      }
      return sessionId
    } catch (error) {
      // Fallback if sessionStorage is not available
      return generateSessionId()
    }
  }
}

/**
 * Behavior tracking implementation
 */
class BehaviorTracker {
  private config: AdaptConfig
  private sessionId: string
  private events: BehaviorEvent[] = []
  private isTracking = false
  private eventHandlers: Map<string, EventHandler> = new Map()
  private debouncedSend: () => void
  private throttledMouseMove: EventHandler
  private throttledScroll: EventHandler

  constructor(config: AdaptConfig, sessionId: string) {
    this.config = config
    this.sessionId = sessionId

    // Create debounced and throttled handlers
    this.debouncedSend = debounce(
      this.sendEvents.bind(this),
      config.trackingOptions.debounceMs
    )
    
    this.throttledMouseMove = throttle(
      this.handleMouseMove.bind(this),
      100
    )
    
    this.throttledScroll = throttle(
      this.handleScroll.bind(this),
      200
    )
  }

  /**
   * Start behavior tracking
   */
  async startTracking(): Promise<void> {
    if (this.isTracking) return

    this.isTracking = true
    this.setupEventListeners()

    // Track initial page load
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
        },
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
    })
  }

  /**
   * Stop behavior tracking
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) return

    this.isTracking = false
    this.removeEventListeners()

    // Send remaining events
    if (this.events.length > 0) {
      await this.sendEvents()
    }
  }

  /**
   * Track a behavior event
   */
  async trackEvent(event: Partial<BehaviorEvent>): Promise<void> {
    if (!this.isTracking) return

    const fullEvent: BehaviorEvent = {
      id: generateEventId(),
      sessionId: this.sessionId,
      formId: event.formId || 'unknown',
      eventType: event.eventType!,
      fieldName: event.fieldName,
      timestamp: event.timestamp || Date.now(),
      data: event.data || {},
      userAgent: event.userAgent || navigator.userAgent,
      url: event.url || window.location.href,
    }

    this.events.push(fullEvent)

    if (this.config.debugging) {
      console.log('Tracked event:', fullEvent)
    }

    // Send events immediately for critical events or when batch is full
    if (
      fullEvent.eventType === 'form_submit' ||
      this.events.length >= this.config.trackingOptions.batchSize
    ) {
      await this.sendEvents()
    } else {
      this.debouncedSend()
    }
  }

  /**
   * Setup event listeners for different tracking options
   */
  private setupEventListeners(): void {
    const { trackingOptions } = this.config

    // Mouse tracking
    if (trackingOptions.trackMouse) {
      const mouseMoveHandler = this.throttledMouseMove
      const clickHandler = this.handleMouseClick.bind(this)
      
      document.addEventListener('mousemove', mouseMoveHandler)
      document.addEventListener('click', clickHandler)
      
      this.eventHandlers.set('mousemove', mouseMoveHandler)
      this.eventHandlers.set('click', clickHandler)
    }

    // Keyboard tracking
    if (trackingOptions.trackKeyboard) {
      const keyHandler = this.handleKeyPress.bind(this)
      document.addEventListener('keypress', keyHandler)
      this.eventHandlers.set('keypress', keyHandler)
    }

    // Scroll tracking
    if (trackingOptions.trackScroll) {
      const scrollHandler = this.throttledScroll
      window.addEventListener('scroll', scrollHandler)
      this.eventHandlers.set('scroll', scrollHandler)
    }

    // Form-specific tracking
    this.setupFormTracking()
  }

  /**
   * Setup form-specific event listeners
   */
  private setupFormTracking(): void {
    const forms = findFormElements()
    
    forms.forEach(form => {
      const formId = form.id || form.dataset.formId || `form-${Date.now()}`
      
      // Form submission
      const submitHandler = (event: Event) => this.handleFormSubmit(event, formId)
      form.addEventListener('submit', submitHandler)
      this.eventHandlers.set(`submit-${formId}`, submitHandler)

      // Field-level tracking
      const fields = getFormFields(form)
      fields.forEach(field => {
        const fieldInfo = getFieldInfo(field)
        
        // Focus events
        const focusHandler = (event: Event) => this.handleFieldFocus(event, formId, fieldInfo)
        field.addEventListener('focus', focusHandler)
        this.eventHandlers.set(`focus-${formId}-${fieldInfo.name}`, focusHandler)
        
        // Blur events
        const blurHandler = (event: Event) => this.handleFieldBlur(event, formId, fieldInfo)
        field.addEventListener('blur', blurHandler)
        this.eventHandlers.set(`blur-${formId}-${fieldInfo.name}`, blurHandler)
        
        // Input events
        const inputHandler = (event: Event) => this.handleFieldChange(event, formId, fieldInfo)
        field.addEventListener('input', inputHandler)
        this.eventHandlers.set(`input-${formId}-${fieldInfo.name}`, inputHandler)
      })
    })
  }

  /**
   * Remove all event listeners
   */
  private removeEventListeners(): void {
    this.eventHandlers.forEach((handler, eventKey) => {
      const [eventType, ...rest] = eventKey.split('-')
      
      if (['mousemove', 'click', 'keypress'].includes(eventType)) {
        document.removeEventListener(eventType, handler)
      } else if (eventType === 'scroll') {
        window.removeEventListener(eventType, handler)
      } else if (['submit', 'focus', 'blur', 'input'].includes(eventType)) {
        // Form-specific events are harder to remove without keeping references
        // In a production implementation, we'd need to keep element references
        console.warn(`Cannot remove ${eventType} listener without element reference`)
      }
    })
    
    this.eventHandlers.clear()
  }

  // Event handlers
  private handleMouseMove(event: MouseEvent): void {
    this.trackEvent({
      formId: this.getFormIdFromTarget(event.target as Element),
      eventType: 'mouse_move',
      data: {
        x: event.clientX,
        y: event.clientY,
        target: (event.target as Element)?.tagName.toLowerCase(),
      },
    })
  }

  private handleMouseClick(event: MouseEvent): void {
    this.trackEvent({
      formId: this.getFormIdFromTarget(event.target as Element),
      eventType: 'mouse_click',
      data: {
        x: event.clientX,
        y: event.clientY,
        target: (event.target as Element)?.tagName.toLowerCase(),
        button: event.button,
      },
    })
  }

  private handleKeyPress(event: KeyboardEvent): void {
    this.trackEvent({
      formId: this.getFormIdFromTarget(event.target as Element),
      eventType: 'key_press',
      fieldName: (event.target as HTMLInputElement)?.name || (event.target as HTMLInputElement)?.id,
      data: {
        key: event.key,
        keyCode: event.keyCode,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      },
    })
  }

  private handleScroll(): void {
    this.trackEvent({
      formId: 'page',
      eventType: 'scroll',
      data: {
        scrollTop: window.pageYOffset,
        scrollLeft: window.pageXOffset,
        documentHeight: document.documentElement.scrollHeight,
        windowHeight: window.innerHeight,
      },
    })
  }

  private handleFormSubmit(event: Event, formId: string): void {
    const form = event.target as HTMLFormElement
    this.trackEvent({
      formId,
      eventType: 'form_submit',
      data: {
        action: form.action,
        method: form.method,
        fieldCount: getFormFields(form).length,
      },
    })
  }

  private handleFieldFocus(event: Event, formId: string, fieldInfo: any): void {
    this.trackEvent({
      formId,
      eventType: 'focus',
      fieldName: fieldInfo.name,
      data: {
        fieldType: fieldInfo.type,
        required: fieldInfo.required,
        focusTime: Date.now(),
      },
    })
  }

  private handleFieldBlur(event: Event, formId: string, fieldInfo: any): void {
    const target = event.target as HTMLInputElement
    this.trackEvent({
      formId,
      eventType: 'blur',
      fieldName: fieldInfo.name,
      data: {
        fieldType: fieldInfo.type,
        hasValue: !!target.value,
        valueLength: target.value?.length || 0,
        blurTime: Date.now(),
      },
    })
  }

  private handleFieldChange(event: Event, formId: string, fieldInfo: any): void {
    const target = event.target as HTMLInputElement
    this.trackEvent({
      formId,
      eventType: 'field_change',
      fieldName: fieldInfo.name,
      data: {
        fieldType: fieldInfo.type,
        valueLength: target.value?.length || 0,
        changeTime: Date.now(),
      },
    })
  }

  /**
   * Get form ID from target element
   */
  private getFormIdFromTarget(target: Element | null): string {
    if (!target) return 'unknown'
    
    const form = target.closest('form')
    if (form) {
      return form.id || form.dataset.formId || 'form'
    }
    
    return 'page'
  }

  /**
   * Send events to the tracking API
   */
  private async sendEvents(): Promise<void> {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      const response = await fetch(`${this.config.apiUrl}/api/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.adaptations && result.adaptations.length > 0 && this.config.adaptationOptions) {
        // Apply adaptations through the adapter
        for (const adaptation of result.adaptations) {
          await this.adapter?.applyAdaptation(adaptation)
        }
      }

      if (this.config.debugging) {
        console.log('Events sent successfully:', result)
      }

    } catch (error) {
      console.error('Failed to send events:', error)
      
      // Re-add events to queue for retry (up to a limit)
      if (this.events.length < 100) {
        this.events.unshift(...eventsToSend)
      }
    }
  }

  private adapter?: DOMAdapter
}

/**
 * DOM Adapter for applying form adaptations
 */
class DOMAdapter {
  private config: AdaptConfig
  private appliedAdaptations = new Set<string>()

  constructor(config: AdaptConfig) {
    this.config = config
  }

  /**
   * Apply a form adaptation
   */
  async applyAdaptation(adaptation: FormAdaptation): Promise<void> {
    const adaptationKey = `${adaptation.sessionId}-${adaptation.adaptationType}-${adaptation.appliedAt}`
    
    if (this.appliedAdaptations.has(adaptationKey)) {
      return // Already applied
    }

    try {
      switch (adaptation.adaptationType) {
        case 'field_reorder':
          if (this.config.adaptationOptions.enableFieldReordering) {
            await this.applyFieldReordering(adaptation)
          }
          break
        case 'progressive_disclosure':
          if (this.config.adaptationOptions.enableProgressiveDisclosure) {
            await this.applyProgressiveDisclosure(adaptation)
          }
          break
        case 'context_switching':
          if (this.config.adaptationOptions.enableContextSwitching) {
            await this.applyContextSwitching(adaptation)
          }
          break
        case 'error_prevention':
          if (this.config.adaptationOptions.enableErrorPrevention) {
            await this.applyErrorPrevention(adaptation)
          }
          break
        default:
          console.warn('Unknown adaptation type:', adaptation.adaptationType)
      }

      this.appliedAdaptations.add(adaptationKey)

      if (this.config.debugging) {
        console.log('Applied adaptation:', adaptation)
      }

    } catch (error) {
      console.error('Failed to apply adaptation:', error, adaptation)
    }
  }

  /**
   * Apply field reordering adaptation
   */
  private async applyFieldReordering(adaptation: FormAdaptation): Promise<void> {
    const config = adaptation.config.fieldReorder
    if (!config) return

    const form = this.findForm(adaptation.formId)
    if (!form) return

    // Implementation for field reordering
    console.log('Applying field reordering:', config)
    // TODO: Implement actual DOM manipulation
  }

  /**
   * Apply progressive disclosure adaptation
   */
  private async applyProgressiveDisclosure(adaptation: FormAdaptation): Promise<void> {
    const config = adaptation.config.progressiveDisclosure
    if (!config) return

    const form = this.findForm(adaptation.formId)
    if (!form) return

    // Implementation for progressive disclosure
    console.log('Applying progressive disclosure:', config)
    // TODO: Implement actual DOM manipulation
  }

  /**
   * Apply context switching adaptation
   */
  private async applyContextSwitching(adaptation: FormAdaptation): Promise<void> {
    const config = adaptation.config.contextSwitching
    if (!config) return

    const form = this.findForm(adaptation.formId)
    if (!form) return

    // Implementation for context switching
    console.log('Applying context switching:', config)
    // TODO: Implement actual DOM manipulation
  }

  /**
   * Apply error prevention adaptation
   */
  private async applyErrorPrevention(adaptation: FormAdaptation): Promise<void> {
    const config = adaptation.config.errorPrevention
    if (!config) return

    const form = this.findForm(adaptation.formId)
    if (!form) return

    // Implementation for error prevention
    console.log('Applying error prevention:', config)
    // TODO: Implement actual DOM manipulation
  }

  /**
   * Find form by ID
   */
  private findForm(formId: string): HTMLFormElement | null {
    return (
      document.getElementById(formId) as HTMLFormElement ||
      document.querySelector(`[data-form-id="${formId}"]`) as HTMLFormElement ||
      document.querySelector('form') as HTMLFormElement
    )
  }

  /**
   * Clean up adapter resources
   */
  destroy(): void {
    this.appliedAdaptations.clear()
  }
}

// Export the main client class
export default AdaptClientImpl