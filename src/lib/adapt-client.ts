import { BehaviorTracker } from './behavior-tracker'
import { DOMAdapter } from './dom-adapter'
import { AdaptConfig, BehaviorEvent, Adaptation, UserProfile } from './types'

export class AdaptClient {
  private config: AdaptConfig
  private sessionId: string
  private behaviorTracker: BehaviorTracker
  private domAdapter: DOMAdapter
  private ws: WebSocket | null = null
  private eventQueue: BehaviorEvent[] = []
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(config: AdaptConfig) {
    this.config = {
      apiUrl: 'wss://adapt.vercel.app',
      enableRealtimeAdaptations: true,
      enableBehaviorTracking: true,
      debugMode: false,
      ...config
    }
    
    this.sessionId = this.generateSessionId()
    this.behaviorTracker = new BehaviorTracker(this.sessionId, this.config.formId)
    this.domAdapter = new DOMAdapter(`[data-adapt="${this.config.formId}"]`)
  }

  async init(): Promise<void> {
    try {
      if (this.config.debugMode) {
        console.log('Initializing Adapt client for form:', this.config.formId)
      }

      // Initialize behavior tracking
      if (this.config.enableBehaviorTracking) {
        this.behaviorTracker.init(this.handleBehaviorEvent.bind(this))
      }

      // Connect to real-time API
      if (this.config.enableRealtimeAdaptations) {
        await this.connectToRealTimeAPI()
      }

      // Set up graceful degradation
      this.setupErrorHandling()

      if (this.config.debugMode) {
        console.log('Adapt client initialized successfully')
      }
    } catch (error) {
      console.error('Failed to initialize Adapt client:', error)
      this.fallbackToStaticMode()
    }
  }

  private async connectToRealTimeAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.apiUrl}/ws?sessionId=${this.sessionId}&formId=${this.config.formId}`
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.isConnected = true
          this.reconnectAttempts = 0
          this.processEventQueue()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleAdaptationMessage(event.data)
        }

        this.ws.onclose = () => {
          this.isConnected = false
          this.handleDisconnection()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        // Set timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'))
          }
        }, 5000)
      } catch (error) {
        reject(error)
      }
    })
  }

  private handleBehaviorEvent(event: BehaviorEvent): void {
    if (this.config.debugMode) {
      console.log('Behavior event:', event)
    }

    // Add to queue
    this.eventQueue.push(event)

    // Send immediately if connected, otherwise queue for later
    if (this.isConnected && this.ws) {
      this.sendEvent(event)
    }

    // Process user profiling
    this.processUserProfiling(event)
  }

  private sendEvent(event: BehaviorEvent): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({
        type: 'behavior_event',
        data: event
      }))
    }
  }

  private processEventQueue(): void {
    // Send all queued events
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      if (event) {
        this.sendEvent(event)
      }
    }
  }

  private async handleAdaptationMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data)
      
      if (message.type === 'adaptation') {
        await this.applyAdaptation(message.data)
      } else if (message.type === 'user_profile') {
        this.handleUserProfile(message.data)
      } else if (message.type === 'error') {
        console.error('Server error:', message.data)
      }
    } catch (error) {
      console.error('Failed to handle adaptation message:', error)
    }
  }

  private async applyAdaptation(adaptation: Adaptation): Promise<void> {
    try {
      if (this.config.debugMode) {
        console.log('Applying adaptation:', adaptation)
      }

      await this.domAdapter.applyAdaptation(adaptation)

      // Track adaptation performance
      this.trackAdaptationPerformance(adaptation)
    } catch (error) {
      console.error('Failed to apply adaptation:', error)
    }
  }

  private handleUserProfile(profile: UserProfile): void {
    if (this.config.debugMode) {
      console.log('User profile updated:', profile)
    }

    // Store profile for potential offline use
    this.storeUserProfile(profile)
  }

  private processUserProfiling(event: BehaviorEvent): void {
    // Generate updated user profile
    const profile = this.behaviorTracker.generateUserProfile()
    
    // Send profile update if significant change
    if (this.hasSignificantProfileChange(profile)) {
      this.sendUserProfile(profile)
    }
  }

  private hasSignificantProfileChange(profile: UserProfile): boolean {
    // Check if profile has changed significantly
    const storedProfile = this.getStoredUserProfile()
    
    if (!storedProfile) return true
    
    // Check confidence score change
    const confidenceChange = Math.abs((profile.confidenceScore || 0) - (storedProfile.confidenceScore || 0))
    if (confidenceChange > 0.1) return true
    
    // Check behavior type change
    if (profile.behaviorType !== storedProfile.behaviorType) return true
    
    return false
  }

  private sendUserProfile(profile: UserProfile): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({
        type: 'user_profile',
        data: profile
      }))
    }
  }

  private trackAdaptationPerformance(adaptation: Adaptation): void {
    // Track metrics like time to apply, user response, etc.
    const performanceMetrics = {
      adaptationId: adaptation.id,
      appliedAt: Date.now(),
      formId: this.config.formId,
      sessionId: this.sessionId
    }

    // Send performance data
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({
        type: 'performance_metrics',
        data: performanceMetrics
      }))
    }
  }

  private handleDisconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      
      setTimeout(() => {
        this.connectToRealTimeAPI().catch(() => {
          // Continue with offline mode
          this.fallbackToStaticMode()
        })
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts))
    } else {
      this.fallbackToStaticMode()
    }
  }

  private fallbackToStaticMode(): void {
    if (this.config.debugMode) {
      console.log('Falling back to static mode')
    }

    // Continue with basic behavior tracking but no real-time adaptations
    this.config.enableRealtimeAdaptations = false
    
    // Apply cached adaptations if available
    this.applyCachedAdaptations()
  }

  private applyCachedAdaptations(): void {
    const cachedAdaptations = this.getCachedAdaptations()
    
    cachedAdaptations.forEach(adaptation => {
      this.domAdapter.applyAdaptation(adaptation).catch(error => {
        console.error('Failed to apply cached adaptation:', error)
      })
    })
  }

  private setupErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      if (event.filename?.includes('adapt')) {
        console.error('Adapt error:', event.error)
        this.domAdapter.revertToOriginal()
      }
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.stack?.includes('adapt')) {
        console.error('Adapt promise rejection:', event.reason)
        this.domAdapter.revertToOriginal()
      }
    })
  }

  private generateSessionId(): string {
    return 'adapt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  private storeUserProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(`adapt_profile_${this.sessionId}`, JSON.stringify(profile))
    } catch (error) {
      // Ignore storage errors
    }
  }

  private getStoredUserProfile(): UserProfile | null {
    try {
      const stored = localStorage.getItem(`adapt_profile_${this.sessionId}`)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      return null
    }
  }

  private getCachedAdaptations(): Adaptation[] {
    try {
      const cached = localStorage.getItem(`adapt_adaptations_${this.config.formId}`)
      return cached ? JSON.parse(cached) : []
    } catch (error) {
      return []
    }
  }

  // Public API methods
  
  public getSessionId(): string {
    return this.sessionId
  }

  public getCurrentProfile(): UserProfile | null {
    return this.behaviorTracker.generateUserProfile()
  }

  public async optimizeForm(): Promise<void> {
    // Manually trigger form optimization
    const profile = this.behaviorTracker.generateUserProfile()
    
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({
        type: 'optimize_request',
        data: {
          sessionId: this.sessionId,
          formId: this.config.formId,
          profile
        }
      }))
    }
  }

  public revertToOriginal(): void {
    this.domAdapter.revertToOriginal()
  }

  public destroy(): void {
    // Clean up resources
    this.behaviorTracker.destroy()
    
    if (this.ws) {
      this.ws.close()
    }
    
    // Clear stored data
    try {
      localStorage.removeItem(`adapt_profile_${this.sessionId}`)
    } catch (error) {
      // Ignore storage errors
    }
  }
}

// Global initialization function
declare global {
  interface Window {
    Adapt: typeof AdaptClient
    adaptInstances: Map<string, AdaptClient>
  }
}

// Auto-initialize for forms with data-adapt attribute
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('[data-adapt]')
  
  forms.forEach(form => {
    const formId = form.getAttribute('data-adapt')
    const goal = form.getAttribute('data-goal') || 'conversion'
    
    if (formId) {
      const client = new AdaptClient({
        formId,
        goal: goal as any
      })
      
      client.init().catch(error => {
        console.error('Failed to initialize Adapt for form:', formId, error)
      })
      
      // Store instance for later access
      if (!window.adaptInstances) {
        window.adaptInstances = new Map()
      }
      window.adaptInstances.set(formId, client)
    }
  })
})

// Export for manual usage
window.Adapt = AdaptClient

export default AdaptClient