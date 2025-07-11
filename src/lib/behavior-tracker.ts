import { BehaviorEvent, FieldInteractionMetrics, UserProfile } from './types'

export class BehaviorTracker {
  private sessionId: string
  private formId: string
  private eventQueue: BehaviorEvent[] = []
  private fieldMetrics: Map<string, FieldInteractionMetrics> = new Map()
  private observers: Map<string, MutationObserver | IntersectionObserver> = new Map()
  private debounceTimeout: number | null = null
  private onEventCallback?: (event: BehaviorEvent) => void

  constructor(sessionId: string, formId: string) {
    this.sessionId = sessionId
    this.formId = formId
  }

  init(onEvent?: (event: BehaviorEvent) => void): void {
    this.onEventCallback = onEvent
    this.setupEventListeners()
    this.setupObservers()
  }

  private setupEventListeners(): void {
    // Mouse tracking
    document.addEventListener('mousemove', this.handleMouseMove.bind(this))
    document.addEventListener('mouseenter', this.handleMouseEnter.bind(this))
    document.addEventListener('mouseleave', this.handleMouseLeave.bind(this))
    
    // Keyboard tracking
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
    document.addEventListener('keyup', this.handleKeyUp.bind(this))
    
    // Form interaction tracking
    document.addEventListener('focus', this.handleFocus.bind(this), true)
    document.addEventListener('blur', this.handleBlur.bind(this), true)
    document.addEventListener('input', this.handleInput.bind(this), true)
    document.addEventListener('change', this.handleChange.bind(this), true)
    
    // Scroll tracking
    document.addEventListener('scroll', this.handleScroll.bind(this))
    
    // Form submission tracking
    document.addEventListener('submit', this.handleSubmit.bind(this), true)
  }

  private setupObservers(): void {
    // Intersection Observer for visibility tracking
    const intersectionObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      { threshold: 0.5 }
    )
    
    // Mutation Observer for dynamic content changes
    const mutationObserver = new MutationObserver(
      this.handleMutation.bind(this)
    )
    
    // Observe form elements
    const forms = document.querySelectorAll(`[data-adapt="${this.formId}"]`)
    forms.forEach(form => {
      intersectionObserver.observe(form)
      mutationObserver.observe(form, {
        childList: true,
        subtree: true,
        attributes: true
      })
    })
    
    this.observers.set('intersection', intersectionObserver)
    this.observers.set('mutation', mutationObserver)
  }

  private handleMouseMove(event: MouseEvent): void {
    this.debounceEmit({
      sessionId: this.sessionId,
      formId: this.formId,
      eventType: 'mouse_move',
      timestamp: performance.now(),
      data: {
        x: event.clientX,
        y: event.clientY,
        target: this.getElementSelector(event.target as Element)
      }
    })
  }

  private handleMouseEnter(event: MouseEvent): void {
    const element = event.target as HTMLElement
    if (this.isFormField(element)) {
      const fieldName = this.getFieldName(element)
      this.emitEvent({
        sessionId: this.sessionId,
        formId: this.formId,
        eventType: 'field_hover_start',
        fieldName,
        timestamp: performance.now(),
        data: {
          element: this.getElementSelector(element)
        }
      })
    }
  }

  private handleMouseLeave(event: MouseEvent): void {
    const element = event.target as HTMLElement
    if (this.isFormField(element)) {
      const fieldName = this.getFieldName(element)
      this.emitEvent({
        sessionId: this.sessionId,
        formId: this.formId,
        eventType: 'field_hover_end',
        fieldName,
        timestamp: performance.now(),
        data: {
          element: this.getElementSelector(element)
        }
      })
    }
  }

  private handleFocus(event: FocusEvent): void {
    const element = event.target as HTMLElement
    if (this.isFormField(element)) {
      const fieldName = this.getFieldName(element)
      this.startFieldTracking(fieldName, element)
      
      this.emitEvent({
        sessionId: this.sessionId,
        formId: this.formId,
        eventType: 'field_focus',
        fieldName,
        timestamp: performance.now(),
        data: {
          element: this.getElementSelector(element),
          previousElement: this.getElementSelector(event.relatedTarget as Element)
        }
      })
    }
  }

  private handleBlur(event: FocusEvent): void {
    const element = event.target as HTMLElement
    if (this.isFormField(element)) {
      const fieldName = this.getFieldName(element)
      this.endFieldTracking(fieldName)
      
      this.emitEvent({
        sessionId: this.sessionId,
        formId: this.formId,
        eventType: 'field_blur',
        fieldName,
        timestamp: performance.now(),
        data: {
          element: this.getElementSelector(element),
          nextElement: this.getElementSelector(event.relatedTarget as Element),
          value: (element as HTMLInputElement).value
        }
      })
    }
  }

  private handleInput(event: Event): void {
    const element = event.target as HTMLInputElement
    if (this.isFormField(element)) {
      const fieldName = this.getFieldName(element)
      this.trackTypingBehavior(fieldName, element)
      
      this.debounceEmit({
        sessionId: this.sessionId,
        formId: this.formId,
        eventType: 'field_input',
        fieldName,
        timestamp: performance.now(),
        data: {
          element: this.getElementSelector(element),
          valueLength: element.value.length,
          inputType: event.type
        }
      })
    }
  }

  private handleChange(event: Event): void {
    const element = event.target as HTMLInputElement
    if (this.isFormField(element)) {
      const fieldName = this.getFieldName(element)
      
      this.emitEvent({
        sessionId: this.sessionId,
        formId: this.formId,
        eventType: 'field_change',
        fieldName,
        timestamp: performance.now(),
        data: {
          element: this.getElementSelector(element),
          value: element.value,
          type: element.type
        }
      })
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const element = event.target as HTMLElement
    if (this.isFormField(element)) {
      const fieldName = this.getFieldName(element)
      this.trackKeyPresses(fieldName, event)
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Track key release patterns if needed
  }

  private handleScroll(event: Event): void {
    this.debounceEmit({
      sessionId: this.sessionId,
      formId: this.formId,
      eventType: 'scroll',
      timestamp: performance.now(),
      data: {
        scrollY: window.scrollY,
        scrollX: window.scrollX,
        direction: this.getScrollDirection()
      }
    })
  }

  private handleSubmit(event: Event): void {
    const form = event.target as HTMLFormElement
    if (form.dataset.adapt === this.formId) {
      this.emitEvent({
        sessionId: this.sessionId,
        formId: this.formId,
        eventType: 'form_submit',
        timestamp: performance.now(),
        data: {
          formData: this.getFormData(form),
          completionTime: this.calculateCompletionTime(),
          totalInteractions: this.eventQueue.length
        }
      })
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      this.emitEvent({
        sessionId: this.sessionId,
        formId: this.formId,
        eventType: entry.isIntersecting ? 'form_visible' : 'form_hidden',
        timestamp: performance.now(),
        data: {
          intersectionRatio: entry.intersectionRatio,
          boundingClientRect: entry.boundingClientRect
        }
      })
    })
  }

  private handleMutation(mutations: MutationRecord[]): void {
    mutations.forEach(mutation => {
      this.emitEvent({
        sessionId: this.sessionId,
        formId: this.formId,
        eventType: 'dom_change',
        timestamp: performance.now(),
        data: {
          type: mutation.type,
          target: this.getElementSelector(mutation.target as Element),
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length
        }
      })
    })
  }

  private startFieldTracking(fieldName: string, element: HTMLElement): void {
    const metrics: FieldInteractionMetrics = {
      fieldName,
      hoverTime: 0,
      focusTime: performance.now(),
      typingSpeed: 0,
      corrections: 0,
      hesitation: false,
      errorCount: 0
    }
    
    this.fieldMetrics.set(fieldName, metrics)
  }

  private endFieldTracking(fieldName: string): void {
    const metrics = this.fieldMetrics.get(fieldName)
    if (metrics) {
      metrics.focusTime = performance.now() - metrics.focusTime
      this.fieldMetrics.set(fieldName, metrics)
    }
  }

  private trackTypingBehavior(fieldName: string, element: HTMLInputElement): void {
    const metrics = this.fieldMetrics.get(fieldName)
    if (metrics) {
      // Calculate typing speed
      const currentTime = performance.now()
      const timeDiff = currentTime - metrics.focusTime
      const charCount = element.value.length
      
      if (timeDiff > 0 && charCount > 0) {
        metrics.typingSpeed = (charCount / timeDiff) * 1000 * 60 // chars per minute
      }
      
      this.fieldMetrics.set(fieldName, metrics)
    }
  }

  private trackKeyPresses(fieldName: string, event: KeyboardEvent): void {
    const metrics = this.fieldMetrics.get(fieldName)
    if (metrics) {
      // Track corrections (backspace, delete)
      if (event.key === 'Backspace' || event.key === 'Delete') {
        metrics.corrections++
      }
      
      // Track hesitation (long pauses between keystrokes)
      const currentTime = performance.now()
      const lastKeyTime = metrics.focusTime
      if (currentTime - lastKeyTime > 2000) { // 2 second pause
        metrics.hesitation = true
      }
      
      this.fieldMetrics.set(fieldName, metrics)
    }
  }

  private isFormField(element: HTMLElement): boolean {
    return element.tagName === 'INPUT' || 
           element.tagName === 'TEXTAREA' || 
           element.tagName === 'SELECT' ||
           element.contentEditable === 'true'
  }

  private getFieldName(element: HTMLElement): string {
    return element.getAttribute('name') || 
           element.getAttribute('id') || 
           element.className ||
           'unnamed_field'
  }

  private getElementSelector(element: Element | null): string {
    if (!element) return ''
    
    if (element.id) return `#${element.id}`
    if (element.className) return `.${element.className.split(' ').join('.')}`
    
    return element.tagName.toLowerCase()
  }

  private getScrollDirection(): 'up' | 'down' | 'left' | 'right' | 'none' {
    // Implement scroll direction detection
    return 'none'
  }

  private getFormData(form: HTMLFormElement): Record<string, any> {
    const formData = new FormData(form)
    const data: Record<string, any> = {}
    
    for (const [key, value] of formData.entries()) {
      data[key] = value
    }
    
    return data
  }

  private calculateCompletionTime(): number {
    const firstEvent = this.eventQueue[0]
    const lastEvent = this.eventQueue[this.eventQueue.length - 1]
    
    if (firstEvent && lastEvent) {
      return lastEvent.timestamp - firstEvent.timestamp
    }
    
    return 0
  }

  private emitEvent(event: BehaviorEvent): void {
    this.eventQueue.push(event)
    
    if (this.onEventCallback) {
      this.onEventCallback(event)
    }
  }

  private debounceEmit(event: BehaviorEvent): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }
    
    this.debounceTimeout = window.setTimeout(() => {
      this.emitEvent(event)
    }, 50)
  }

  generateUserProfile(): UserProfile {
    const characteristics = this.analyzeFieldMetrics()
    
    return {
      sessionId: this.sessionId,
      behaviorType: this.classifyBehaviorType(characteristics),
      confidenceScore: this.calculateConfidenceScore(characteristics),
      characteristics
    }
  }

  private analyzeFieldMetrics(): UserProfile['characteristics'] {
    const metrics = Array.from(this.fieldMetrics.values())
    
    if (metrics.length === 0) {
      return {}
    }
    
    const avgTypingSpeed = metrics.reduce((sum, m) => sum + m.typingSpeed, 0) / metrics.length
    const avgCorrections = metrics.reduce((sum, m) => sum + m.corrections, 0) / metrics.length
    const hasHesitation = metrics.some(m => m.hesitation)
    const avgFocusTime = metrics.reduce((sum, m) => sum + m.focusTime, 0) / metrics.length
    
    return {
      typingSpeed: avgTypingSpeed,
      errorProne: avgCorrections > 2,
      mobileFinger: this.isMobileDevice(),
      speedRunner: avgTypingSpeed > 200 && avgFocusTime < 5000,
      fieldHesitation: hasHesitation,
      methodical: avgFocusTime > 10000 && avgCorrections < 1
    }
  }

  private classifyBehaviorType(characteristics: UserProfile['characteristics']): string {
    if (characteristics?.speedRunner) return 'speed_runner'
    if (characteristics?.methodical) return 'methodical'
    if (characteristics?.errorProne) return 'error_prone'
    if (characteristics?.mobileFinger) return 'mobile_user'
    if (characteristics?.fieldHesitation) return 'hesitant'
    
    return 'average'
  }

  private calculateConfidenceScore(characteristics: UserProfile['characteristics']): number {
    const eventCount = this.eventQueue.length
    const fieldCount = this.fieldMetrics.size
    
    // Base confidence on amount of data collected
    let confidence = Math.min(eventCount / 100, 1.0) * 0.5
    confidence += Math.min(fieldCount / 5, 1.0) * 0.3
    
    // Add confidence based on clear behavioral patterns
    if (characteristics?.typingSpeed && characteristics.typingSpeed > 0) {
      confidence += 0.1
    }
    
    if (characteristics?.errorProne !== undefined) {
      confidence += 0.1
    }
    
    return Math.min(confidence, 1.0)
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  destroy(): void {
    // Clean up event listeners
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    document.removeEventListener('mouseenter', this.handleMouseEnter.bind(this))
    document.removeEventListener('mouseleave', this.handleMouseLeave.bind(this))
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    document.removeEventListener('keyup', this.handleKeyUp.bind(this))
    document.removeEventListener('focus', this.handleFocus.bind(this), true)
    document.removeEventListener('blur', this.handleBlur.bind(this), true)
    document.removeEventListener('input', this.handleInput.bind(this), true)
    document.removeEventListener('change', this.handleChange.bind(this), true)
    document.removeEventListener('scroll', this.handleScroll.bind(this))
    document.removeEventListener('submit', this.handleSubmit.bind(this), true)
    
    // Clean up observers
    this.observers.forEach(observer => {
      if (observer) {
        observer.disconnect()
      }
    })
    
    this.observers.clear()
  }
}