import { 
  BehaviorEvent, 
  FormAdaptation, 
  AdaptConfig, 
  AdaptClient, 
  EventHandler
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
      apiUrl: config.apiUrl,
      formSelector: config.formSelector,
      debugging: config.debugging,
      trackingOptions: {
        trackMouse: config.trackingOptions?.trackMouse ?? true,
        trackKeyboard: config.trackingOptions?.trackKeyboard ?? true,
        trackScroll: config.trackingOptions?.trackScroll ?? true,
        debounceMs: config.trackingOptions?.debounceMs ?? 100,
        batchSize: config.trackingOptions?.batchSize ?? 10,
        enableProfiling: config.trackingOptions?.enableProfiling ?? false,
      },
      adaptationOptions: {
        enableFieldReordering: config.adaptationOptions?.enableFieldReordering ?? true,
        enableProgressiveDisclosure: config.adaptationOptions?.enableProgressiveDisclosure ?? true,
        enableContextSwitching: config.adaptationOptions?.enableContextSwitching ?? true,
        enableErrorPrevention: config.adaptationOptions?.enableErrorPrevention ?? true,
        confidenceThreshold: config.adaptationOptions?.confidenceThreshold ?? 0.3,
        maxAdaptationsPerSession: config.adaptationOptions?.maxAdaptationsPerSession ?? 10,
      },
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
      this.handleMouseMove.bind(this) as (...args: unknown[]) => void,
      100
    )
    
    this.throttledScroll = throttle(
      this.handleScroll.bind(this) as (...args: unknown[]) => void,
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
      ...(event.fieldName && { fieldName: event.fieldName }),
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
      
      this.eventHandlers.set('mousemove', mouseMoveHandler as EventHandler)
      this.eventHandlers.set('click', clickHandler as EventHandler)
    }

    // Keyboard tracking
    if (trackingOptions.trackKeyboard) {
      const keyHandler = this.handleKeyPress.bind(this)
      document.addEventListener('keypress', keyHandler)
      this.eventHandlers.set('keypress', keyHandler as EventHandler)
    }

    // Scroll tracking
    if (trackingOptions.trackScroll) {
      const scrollHandler = this.throttledScroll
      window.addEventListener('scroll', scrollHandler)
      this.eventHandlers.set('scroll', scrollHandler as EventHandler)
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
      const [eventType] = eventKey.split('-')
      
      if (eventType && ['mousemove', 'click', 'keypress'].includes(eventType)) {
        document.removeEventListener(eventType, handler)
      } else if (eventType === 'scroll') {
        window.removeEventListener(eventType, handler)
      } else if (eventType && ['submit', 'focus', 'blur', 'input'].includes(eventType)) {
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

  private handleFieldFocus(_event: Event, formId: string, fieldInfo: any): void {
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
        case 'field_reordering':
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
        case 'completion_guidance':
          await this.applyCompletionGuidance(adaptation)
          break
        case 'validation_timing':
          await this.applyValidationTiming(adaptation)
          break
        case 'visual_emphasis':
          await this.applyVisualEmphasis(adaptation)
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
    const config = adaptation.config?.fieldReorder || adaptation.parameters
    if (!config || typeof config !== 'object') return

    const form = this.findForm(adaptation.formId)
    if (!form) return

    try {
      // Get field elements
      const fields = Array.from(form.querySelectorAll('input, textarea, select, button'))
      const fieldsByName = new Map<string, Element>()
      
      fields.forEach(field => {
        const name = (field as HTMLInputElement).name || (field as HTMLInputElement).id
        if (name) fieldsByName.set(name, field)
      })

      // Reorder based on configuration
      const newOrder = (config as any).newOrder as string[]
      if (newOrder && Array.isArray(newOrder)) {
        const fragment = document.createDocumentFragment()
        
        // Add fields in new order
        newOrder.forEach(fieldName => {
          const field = fieldsByName.get(fieldName)
          if (field && field.parentElement) {
            // Move the entire field container (label + input)
            const container = field.closest('.field-container') || 
                            field.closest('div') || 
                            field.parentElement
            if (container) {
              fragment.appendChild(container.cloneNode(true))
              container.remove()
            }
          }
        })

        // Add remaining fields
        fieldsByName.forEach((field, name) => {
          const newOrder = (config as any).newOrder as string[]
          if (!newOrder?.includes(name) && field.parentElement) {
            const container = field.closest('.field-container') || 
                            field.closest('div') || 
                            field.parentElement
            if (container && container.parentElement === form) {
              fragment.appendChild(container.cloneNode(true))
              container.remove()
            }
          }
        })

        // Append reordered fields to form
        form.appendChild(fragment)
      }

      if (this.config.debugging) {
        console.log('Applied field reordering:', config)
      }
    } catch (error) {
      console.error('Failed to apply field reordering:', error)
    }
  }

  /**
   * Apply progressive disclosure adaptation
   */
  private async applyProgressiveDisclosure(adaptation: FormAdaptation): Promise<void> {
    const config = adaptation.config?.progressiveDisclosure || adaptation.parameters
    if (!config) return

    const form = this.findForm(adaptation.formId)
    if (!form) return

    try {
      const fields = Array.from(form.querySelectorAll('input, textarea, select'))
      const initialFieldCount = (config as any).initialFields as number || 3

      // Hide fields beyond initial count
      fields.forEach((field, index) => {
        const container = field.closest('div') || field.parentElement
        if (container && index >= initialFieldCount) {
          container.style.display = 'none'
          container.setAttribute('data-adapt-hidden', 'true')
        }
      })

      // Show "Show more fields" button if we have hidden fields
      const hiddenFields = fields.slice(initialFieldCount)
      if (hiddenFields.length > 0) {
        const showMoreBtn = document.createElement('button')
        showMoreBtn.type = 'button'
        showMoreBtn.textContent = `Show ${hiddenFields.length} more field${hiddenFields.length > 1 ? 's' : ''}`
        showMoreBtn.className = 'adapt-show-more-btn'
        showMoreBtn.style.cssText = `
          margin: 10px 0;
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        `

        showMoreBtn.addEventListener('click', () => {
          hiddenFields.forEach(field => {
            const container = field.closest('div') || field.parentElement
            if (container && container.hasAttribute('data-adapt-hidden')) {
              container.style.display = ''
              container.removeAttribute('data-adapt-hidden')
            }
          })
          showMoreBtn.remove()
        })

        // Insert button after the last visible field
        const lastVisibleField = fields[initialFieldCount - 1]
        if (lastVisibleField) {
          const container = lastVisibleField.closest('div') || lastVisibleField.parentElement
          if (container && container.parentNode) {
            container.parentNode.insertBefore(showMoreBtn, container.nextSibling)
          }
        }
      }

      if (this.config.debugging) {
        console.log('Applied progressive disclosure:', config)
      }
    } catch (error) {
      console.error('Failed to apply progressive disclosure:', error)
    }
  }

  /**
   * Apply context switching adaptation
   */
  private async applyContextSwitching(adaptation: FormAdaptation): Promise<void> {
    const config = adaptation.config?.contextSwitching || adaptation.parameters
    if (!config) return

    const form = this.findForm(adaptation.formId)
    if (!form) return

    try {
      // Hide specified fields
      if (config.hideFields && Array.isArray(config.hideFields)) {
        config.hideFields.forEach(fieldName => {
          const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`)
          if (field) {
            const container = field.closest('div') || field.parentElement
            if (container) {
              container.style.display = 'none'
              container.setAttribute('data-adapt-context-hidden', 'true')
            }
          }
        })
      }

      // Show specified fields
      if (config.showFields && Array.isArray(config.showFields)) {
        config.showFields.forEach(fieldName => {
          const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`)
          if (field) {
            const container = field.closest('div') || field.parentElement
            if (container) {
              container.style.display = ''
              container.removeAttribute('data-adapt-context-hidden')
            }
          }
        })
      }

      // Apply mobile optimizations
      if (config.mobileOptimized) {
        form.style.cssText += `
          max-width: 100%;
          padding: 10px;
        `
        
        // Make inputs larger for mobile
        const inputs = form.querySelectorAll('input, textarea, select')
        inputs.forEach(input => {
          (input as HTMLElement).style.cssText += `
            min-height: 44px;
            font-size: 16px;
            padding: 12px;
          `
        })
      }

      if (this.config.debugging) {
        console.log('Applied context switching:', config)
      }
    } catch (error) {
      console.error('Failed to apply context switching:', error)
    }
  }

  /**
   * Apply error prevention adaptation
   */
  private async applyErrorPrevention(adaptation: FormAdaptation): Promise<void> {
    const config = adaptation.config?.errorPrevention || adaptation.parameters
    if (!config) return

    const form = this.findForm(adaptation.formId)
    if (!form) return

    try {
      const fields = form.querySelectorAll('input, textarea, select')

      fields.forEach(field => {
        const input = field as HTMLInputElement
        
        // Add real-time validation
        if ((config as any).enableRealTimeValidation) {
          input.addEventListener('input', () => {
            this.validateField(input)
          })

          input.addEventListener('blur', () => {
            this.validateField(input)
          })
        }

        // Add inline help
        if ((config as any).enableInlineHelp) {
          this.addInlineHelp(input, (config as any).helpText as string || 'Please check this field')
        }
      })

      if (this.config.debugging) {
        console.log('Applied error prevention:', config)
      }
    } catch (error) {
      console.error('Failed to apply error prevention:', error)
    }
  }

  /**
   * Apply validation timing adaptation
   */
  private async applyValidationTiming(adaptation: FormAdaptation): Promise<void> {
    const config = adaptation.config?.validationTiming || adaptation.parameters
    if (!config) return

    const form = this.findForm(adaptation.formId)
    if (!form) return

    try {
      const fields = form.querySelectorAll('input, textarea, select')
      
      // Apply optimized validation timing based on user behavior
      fields.forEach(field => {
        const input = field as HTMLInputElement
        
        // Remove existing validation listeners
        const existingListeners = input.dataset.adaptValidationListeners
        if (existingListeners) {
          return // Already has validation timing applied
        }
        
        // Apply timing-optimized validation
        const validationDelay = (config as any).delay || 300 // Default 300ms delay
        let validationTimeout: NodeJS.Timeout
        
        const optimizedValidation = () => {
          clearTimeout(validationTimeout)
          validationTimeout = setTimeout(() => {
            this.performFieldValidation(input)
          }, validationDelay)
        }
        
        // Add debounced validation on input
        input.addEventListener('input', optimizedValidation)
        
        // Immediate validation on blur for better UX
        input.addEventListener('blur', () => {
          clearTimeout(validationTimeout)
          this.performFieldValidation(input)
        })
        
        // Mark as having validation timing applied
        input.dataset.adaptValidationListeners = 'true'
      })

      if (this.config.debugging) {
        console.log('Applied validation timing:', config)
      }
    } catch (error) {
      console.error('Failed to apply validation timing:', error)
    }
  }

  /**
   * Apply visual emphasis adaptation
   */
  private async applyVisualEmphasis(adaptation: FormAdaptation): Promise<void> {
    const config = adaptation.config?.visualEmphasis || adaptation.parameters
    const cssChanges = adaptation.cssChanges
    
    const form = this.findForm(adaptation.formId)
    if (!form) return

    try {
      // Apply CSS changes if provided
      if (cssChanges) {
        Object.entries(cssChanges).forEach(([selector, styles]) => {
          const elements = form.querySelectorAll(selector) || document.querySelectorAll(selector)
          elements.forEach(element => {
            const htmlElement = element as HTMLElement
            // Parse and apply styles
            const styleRules = styles.split(';').filter(rule => rule.trim())
            styleRules.forEach(rule => {
              const [property, value] = rule.split(':').map(s => s.trim())
              if (property && value) {
                htmlElement.style.setProperty(property, value)
              }
            })
          })
        })
      }

      // Apply config-based visual emphasis
      if (config) {
        const fields = form.querySelectorAll('input, textarea, select')
        const emphasisType = (config as any).emphasisType || 'border'
        const highlightColor = (config as any).highlightColor || '#007bff'
        const borderWidth = (config as any).borderWidth || '2px'
        const animationDuration = (config as any).animationDuration || 300

        fields.forEach(field => {
          const element = field as HTMLElement
          
          // Skip if already emphasized
          if (element.dataset.adaptEmphasized) return
          
          // Apply emphasis based on type
          switch (emphasisType) {
            case 'border':
              element.style.borderColor = highlightColor
              element.style.borderWidth = borderWidth
              element.style.transition = `border-color ${animationDuration}ms ease`
              break
            case 'background':
              element.style.backgroundColor = highlightColor + '10' // Add transparency
              element.style.transition = `background-color ${animationDuration}ms ease`
              break
            case 'shadow':
              element.style.boxShadow = `0 0 8px ${highlightColor}`
              element.style.transition = `box-shadow ${animationDuration}ms ease`
              break
            case 'pulse':
              element.style.animation = `adapt-pulse ${animationDuration * 2}ms ease-in-out infinite`
              this.addPulseAnimation(highlightColor)
              break
          }
          
          // Mark as emphasized
          element.dataset.adaptEmphasized = 'true'
        })
      }

      if (this.config.debugging) {
        console.log('Applied visual emphasis:', { config, cssChanges })
      }
    } catch (error) {
      console.error('Failed to apply visual emphasis:', error)
    }
  }

  /**
   * Add pulse animation CSS if not already present
   */
  private addPulseAnimation(color: string): void {
    if (document.querySelector('#adapt-pulse-animation')) return
    
    const style = document.createElement('style')
    style.id = 'adapt-pulse-animation'
    style.textContent = `
      @keyframes adapt-pulse {
        0% { box-shadow: 0 0 0 0 ${color}40; }
        70% { box-shadow: 0 0 0 10px ${color}00; }
        100% { box-shadow: 0 0 0 0 ${color}00; }
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Apply completion guidance adaptation
   */
  private async applyCompletionGuidance(adaptation: FormAdaptation): Promise<void> {
    const config = adaptation.config?.completionGuidance || adaptation.parameters
    if (!config) return

    const form = this.findForm(adaptation.formId)
    if (!form) return

    try {
      // Add progress indicator
      if (config.showProgress) {
        const progressBar = this.createProgressBar(form)
        if (progressBar) {
          form.insertBefore(progressBar, form.firstChild)
        }
      }

      // Add confirmation messages
      if (config.confirmationMessages) {
        const fields = form.querySelectorAll('input, textarea, select')
        fields.forEach(field => {
          field.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement
            if (target.value) {
              this.showConfirmationMessage(target, '✓ Good!')
            }
          })
        })
      }

      if (this.config.debugging) {
        console.log('Applied completion guidance:', config)
      }
    } catch (error) {
      console.error('Failed to apply completion guidance:', error)
    }
  }

  /**
   * Perform optimized field validation with timing control
   */
  private performFieldValidation(input: HTMLInputElement): void {
    const isValid = input.checkValidity()
    const hasValue = input.value && input.value.trim() !== ''
    
    // Remove existing validation indicators
    const existingIndicator = input.parentElement?.querySelector('.adapt-validation-indicator')
    if (existingIndicator) existingIndicator.remove()
    
    // Only show validation for fields with content or required fields
    if (hasValue || input.required) {
      const indicator = document.createElement('span')
      indicator.className = 'adapt-validation-indicator'
      indicator.style.cssText = `
        margin-left: 8px;
        font-size: 12px;
        transition: opacity 0.2s ease;
      `
      
      if (isValid) {
        indicator.textContent = '✓'
        indicator.style.color = '#28a745'
      } else {
        indicator.textContent = '!'
        indicator.style.color = '#dc3545'
      }
      
      if (input.parentElement) {
        input.parentElement.appendChild(indicator)
        
        // Auto-fade after 2 seconds for successful validations
        if (isValid) {
          setTimeout(() => {
            if (indicator.parentElement) {
              indicator.style.opacity = '0.3'
            }
          }, 2000)
        }
      }
    }
    
    // Update field styling
    this.validateField(input)
  }

  /**
   * Validate a field with visual feedback
   */
  private validateField(input: HTMLInputElement): void {
    const isValid = input.checkValidity()
    
    // Remove existing validation styles
    input.classList.remove('adapt-valid', 'adapt-invalid')
    
    // Add validation styles
    input.classList.add(isValid ? 'adapt-valid' : 'adapt-invalid')
    
    // Add CSS if not already added
    if (!document.querySelector('#adapt-validation-styles')) {
      const style = document.createElement('style')
      style.id = 'adapt-validation-styles'
      style.textContent = `
        .adapt-valid { border-color: #28a745 !important; }
        .adapt-invalid { border-color: #dc3545 !important; }
        .adapt-help-text { 
          font-size: 12px; 
          color: #6c757d; 
          margin-top: 4px; 
        }
        .adapt-confirmation { 
          color: #28a745; 
          font-size: 12px; 
          margin-left: 8px; 
        }
      `
      document.head.appendChild(style)
    }
  }

  /**
   * Add inline help text to a field
   */
  private addInlineHelp(input: HTMLInputElement, helpText: string): void {
    const existing = input.parentElement?.querySelector('.adapt-help-text')
    if (existing) return

    const helpElement = document.createElement('div')
    helpElement.className = 'adapt-help-text'
    helpElement.textContent = helpText
    
    if (input.parentElement) {
      input.parentElement.appendChild(helpElement)
    }
  }

  /**
   * Show confirmation message for field completion
   */
  private showConfirmationMessage(input: HTMLInputElement, message: string): void {
    // Remove existing confirmation
    const existing = input.parentElement?.querySelector('.adapt-confirmation')
    if (existing) existing.remove()

    const confirmElement = document.createElement('span')
    confirmElement.className = 'adapt-confirmation'
    confirmElement.textContent = message

    if (input.parentElement) {
      input.parentElement.appendChild(confirmElement)
    }

    // Auto remove after 3 seconds
    setTimeout(() => {
      confirmElement.remove()
    }, 3000)
  }

  /**
   * Create progress bar for form completion
   */
  private createProgressBar(form: HTMLFormElement): HTMLElement | null {
    // Check if progress bar already exists
    if (form.querySelector('.adapt-progress-bar')) return null

    const progressContainer = document.createElement('div')
    progressContainer.className = 'adapt-progress-container'
    progressContainer.style.cssText = `
      width: 100%;
      background-color: #e9ecef;
      border-radius: 4px;
      margin-bottom: 20px;
      height: 8px;
    `

    const progressBar = document.createElement('div')
    progressBar.className = 'adapt-progress-bar'
    progressBar.style.cssText = `
      height: 100%;
      background-color: #007bff;
      border-radius: 4px;
      width: 0%;
      transition: width 0.3s ease;
    `

    progressContainer.appendChild(progressBar)

    // Update progress on field changes
    const fields = form.querySelectorAll('input, textarea, select')
    const updateProgress = () => {
      const completedFields = Array.from(fields).filter(field => {
        const input = field as HTMLInputElement
        return input.value && input.value.trim() !== ''
      })
      
      const progress = (completedFields.length / fields.length) * 100
      progressBar.style.width = `${progress}%`
    }

    fields.forEach(field => {
      field.addEventListener('input', updateProgress)
      field.addEventListener('change', updateProgress)
    })

    // Initial progress calculation
    updateProgress()

    return progressContainer
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