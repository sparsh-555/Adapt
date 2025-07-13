import { BehaviorEvent, UserProfile, FormAdaptation } from '@/types'

/**
 * Enhanced Session Manager with contextual analysis and cross-session learning
 * Phase 2: User session management and contextual analysis system
 */
export class SessionManager {
  private sessionId: string
  private userId: string | null = null
  private sessionData: SessionData
  private contextAnalyzer: ContextAnalyzer
  private persistenceManager: PersistenceManager
  private debugging: boolean

  constructor(sessionId: string, debugging = false) {
    this.sessionId = sessionId
    this.debugging = debugging
    this.persistenceManager = new PersistenceManager()
    this.contextAnalyzer = new ContextAnalyzer(this.persistenceManager)
    this.sessionData = this.initializeSession()
  }

  /**
   * Initialize session with historical context
   */
  private initializeSession(): SessionData {
    const existingSession = this.persistenceManager.getSessionData(this.sessionId)
    const userHistory = this.persistenceManager.getUserHistory(this.userId)

    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: existingSession?.startTime || Date.now(),
      lastActivity: Date.now(),
      events: existingSession?.events || [],
      adaptations: existingSession?.adaptations || [],
      userProfile: existingSession?.userProfile || null,
      context: {
        device: this.detectDeviceContext(),
        browser: this.detectBrowserContext(),
        temporal: this.detectTemporalContext(),
        behavioral: this.initializeBehavioralContext(userHistory),
        session: this.detectSessionContext(),
      },
      metrics: {
        totalEvents: existingSession?.events?.length || 0,
        totalAdaptations: existingSession?.adaptations?.length || 0,
        sessionDuration: 0,
        engagementScore: 0,
        conversionLikelihood: 0.5,
      },
      flags: {
        isReturningUser: !!userHistory,
        isHighValueSession: false,
        needsAssistance: false,
        riskOfAbandonment: false,
      }
    }
  }

  /**
   * Update session with new behavior event
   */
  async updateWithEvent(event: BehaviorEvent): Promise<void> {
    this.sessionData.events.push(event)
    this.sessionData.lastActivity = Date.now()
    this.sessionData.metrics.totalEvents++
    this.sessionData.metrics.sessionDuration = this.sessionData.lastActivity - this.sessionData.startTime

    // Update contextual analysis
    await this.contextAnalyzer.analyzeEvent(event, this.sessionData)

    // Update session flags based on new event
    this.updateSessionFlags()

    // Persist session data
    await this.persistSession()

    if (this.debugging) {
      console.log('Session updated with event:', {
        sessionId: this.sessionId,
        eventType: event.eventType,
        totalEvents: this.sessionData.metrics.totalEvents,
        engagementScore: this.sessionData.metrics.engagementScore
      })
    }
  }

  /**
   * Update session with applied adaptation
   */
  async updateWithAdaptation(adaptation: FormAdaptation): Promise<void> {
    this.sessionData.adaptations.push({
      ...adaptation,
      appliedAt: Date.now(),
      sessionContext: this.getSessionContext()
    })
    this.sessionData.metrics.totalAdaptations++

    // Analyze adaptation effectiveness
    await this.contextAnalyzer.analyzeAdaptationImpact(adaptation, this.sessionData)

    await this.persistSession()

    if (this.debugging) {
      console.log('Session updated with adaptation:', {
        sessionId: this.sessionId,
        adaptationType: adaptation.adaptationType,
        confidence: adaptation.confidence
      })
    }
  }

  /**
   * Get contextual recommendations for new adaptations
   */
  async getContextualRecommendations(): Promise<ContextualRecommendation[]> {
    const recommendations = await this.contextAnalyzer.generateRecommendations(this.sessionData)
    
    if (this.debugging) {
      console.log('Generated contextual recommendations:', recommendations)
    }

    return recommendations
  }

  /**
   * Get enhanced user profile with session context
   */
  getEnhancedUserProfile(): EnhancedUserProfile {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      baseProfile: this.sessionData.userProfile,
      sessionMetrics: this.sessionData.metrics,
      contextualInsights: this.contextAnalyzer.getContextualInsights(this.sessionData),
      behavioralPatterns: this.contextAnalyzer.getBehavioralPatterns(this.sessionData),
      riskFactors: this.identifyRiskFactors(),
      opportunities: this.identifyOpportunities(),
      sessionFlags: this.sessionData.flags,
    }
  }

  /**
   * Update session flags based on current data
   */
  private updateSessionFlags(): void {
    const { metrics, events, context } = this.sessionData

    // Update engagement score
    metrics.engagementScore = this.calculateEngagementScore()

    // Update conversion likelihood
    metrics.conversionLikelihood = this.calculateConversionLikelihood()

    // Update flags
    this.sessionData.flags.isHighValueSession = metrics.engagementScore > 0.7
    this.sessionData.flags.needsAssistance = this.detectNeedsAssistance()
    this.sessionData.flags.riskOfAbandonment = this.detectAbandonmentRisk()
  }

  /**
   * Calculate engagement score based on behavior patterns
   */
  private calculateEngagementScore(): number {
    const { events, metrics } = this.sessionData
    
    if (events.length === 0) return 0

    let score = 0

    // Event diversity
    const eventTypes = new Set(events.map(e => e.eventType))
    score += Math.min(eventTypes.size / 6, 0.3) // Max 0.3 for diversity

    // Session duration (optimal around 2-5 minutes)
    const durationMinutes = metrics.sessionDuration / 60000
    if (durationMinutes >= 2 && durationMinutes <= 5) {
      score += 0.3
    } else if (durationMinutes > 5) {
      score += Math.max(0.1, 0.3 - (durationMinutes - 5) * 0.05)
    }

    // Activity frequency
    const eventsPerMinute = events.length / Math.max(durationMinutes, 1)
    if (eventsPerMinute >= 5 && eventsPerMinute <= 20) {
      score += 0.2
    }

    // Form completion indicators
    const formSubmits = events.filter(e => e.eventType === 'form_submit').length
    const fieldInteractions = events.filter(e => e.eventType === 'field_change').length
    if (formSubmits > 0) score += 0.2
    if (fieldInteractions > 3) score += 0.1

    return Math.min(score, 1)
  }

  /**
   * Calculate conversion likelihood
   */
  private calculateConversionLikelihood(): number {
    const { events, adaptations, context, flags } = this.sessionData

    let likelihood = 0.5 // Base likelihood

    // Positive indicators
    if (flags.isReturningUser) likelihood += 0.2
    if (events.some(e => e.eventType === 'form_submit')) likelihood += 0.3
    if (adaptations.length > 0) likelihood += 0.1
    if (context.behavioral.confidenceLevel > 0.7) likelihood += 0.15

    // Negative indicators
    if (flags.riskOfAbandonment) likelihood -= 0.2
    if (context.behavioral.errorRate > 0.2) likelihood -= 0.15
    if (this.sessionData.metrics.sessionDuration > 600000) likelihood -= 0.1 // >10 min

    return Math.max(0, Math.min(1, likelihood))
  }

  /**
   * Detect if user needs assistance
   */
  private detectNeedsAssistance(): boolean {
    const { events, context } = this.sessionData

    // High error rate
    if (context.behavioral.errorRate > 0.25) return true

    // Long hesitation times
    if (context.behavioral.averageHesitation > 5000) return true

    // Multiple failed form submissions
    const failedSubmissions = events.filter(e => 
      e.eventType === 'form_submit' && e.data?.success === false
    ).length
    if (failedSubmissions > 1) return true

    // Low typing confidence
    if (context.behavioral.typingConfidence < 0.3) return true

    return false
  }

  /**
   * Detect abandonment risk
   */
  private detectAbandonmentRisk(): boolean {
    const { events, metrics, context } = this.sessionData

    // Very long session without progress
    if (metrics.sessionDuration > 600000 && metrics.totalEvents < 10) return true

    // High bounce rate patterns
    if (events.length < 3 && metrics.sessionDuration > 30000) return true

    // Multiple visibility changes (user switching tabs)
    const visibilityChanges = events.filter(e => e.eventType === 'visibility_change').length
    if (visibilityChanges > 3) return true

    // Declining engagement
    if (context.behavioral.recentEngagement < 0.3) return true

    return false
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(): string[] {
    const risks: string[] = []
    const { context, flags, metrics } = this.sessionData

    if (context.behavioral.errorRate > 0.2) {
      risks.push('High error rate detected')
    }

    if (metrics.sessionDuration > 600000) {
      risks.push('Extended session duration suggests difficulty')
    }

    if (flags.riskOfAbandonment) {
      risks.push('User showing abandonment patterns')
    }

    if (context.device.isMobile && context.behavioral.scrollFrequency > 0.8) {
      risks.push('Excessive scrolling on mobile device')
    }

    if (context.temporal.timeOfDay === 'late_night' && context.behavioral.typingSpeed < 0.3) {
      risks.push('Low performance during late hours')
    }

    return risks
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOpportunities(): string[] {
    const opportunities: string[] = []
    const { context, flags, metrics } = this.sessionData

    if (flags.isReturningUser && context.behavioral.confidenceLevel > 0.7) {
      opportunities.push('High-confidence returning user - optimize for efficiency')
    }

    if (context.behavioral.typingSpeed > 0.8 && context.behavioral.errorRate < 0.1) {
      opportunities.push('Fast, accurate user - enable advanced features')
    }

    if (context.device.isMobile && context.behavioral.precision < 0.5) {
      opportunities.push('Mobile user with precision issues - optimize touch targets')
    }

    if (metrics.engagementScore > 0.7 && !flags.isHighValueSession) {
      opportunities.push('High engagement detected - potential for conversion')
    }

    if (context.behavioral.helpSeeking > 0.5) {
      opportunities.push('User seeking help - provide enhanced guidance')
    }

    return opportunities
  }

  /**
   * Get current session context
   */
  private getSessionContext(): SessionContext {
    return {
      timestamp: Date.now(),
      sessionDuration: this.sessionData.metrics.sessionDuration,
      eventCount: this.sessionData.metrics.totalEvents,
      engagementScore: this.sessionData.metrics.engagementScore,
      flags: { ...this.sessionData.flags }
    }
  }

  /**
   * Persist session data
   */
  private async persistSession(): Promise<void> {
    try {
      await this.persistenceManager.saveSessionData(this.sessionData)
      
      // Also update user history if userId is available
      if (this.userId) {
        await this.persistenceManager.updateUserHistory(this.userId, this.sessionData)
      }
    } catch (error) {
      if (this.debugging) {
        console.error('Failed to persist session:', error)
      }
    }
  }

  /**
   * Detect device context
   */
  private detectDeviceContext(): DeviceContext {
    if (typeof window === 'undefined') {
      return { type: 'unknown', isMobile: false, isTablet: false, capabilities: {} }
    }

    const userAgent = navigator.userAgent
    const isMobile = /Mobile|Android|iPhone/i.test(userAgent)
    const isTablet = /Tablet|iPad/i.test(userAgent)

    return {
      type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      isMobile,
      isTablet,
      capabilities: {
        touchSupported: 'ontouchstart' in window,
        deviceMemory: (navigator as any).deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
        connection: this.getConnectionInfo(),
      }
    }
  }

  /**
   * Detect browser context
   */
  private detectBrowserContext(): BrowserContext {
    if (typeof window === 'undefined') {
      return { name: 'unknown', version: 'unknown', capabilities: {} }
    }

    const userAgent = navigator.userAgent
    let browserName = 'unknown'
    
    if (userAgent.includes('Chrome')) browserName = 'chrome'
    else if (userAgent.includes('Firefox')) browserName = 'firefox'
    else if (userAgent.includes('Safari')) browserName = 'safari'
    else if (userAgent.includes('Edge')) browserName = 'edge'

    return {
      name: browserName,
      version: this.extractBrowserVersion(userAgent, browserName),
      capabilities: {
        webglSupported: !!document.createElement('canvas').getContext('webgl'),
        webgpuSupported: 'gpu' in navigator,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        localStorageSupported: this.testLocalStorage(),
      }
    }
  }

  /**
   * Detect temporal context
   */
  private detectTemporalContext(): TemporalContext {
    const now = new Date()
    const hour = now.getHours()
    
    let timeOfDay: string
    if (hour >= 6 && hour < 12) timeOfDay = 'morning'
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon'
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening'
    else timeOfDay = 'late_night'

    const dayOfWeek = now.getDay() // 0 = Sunday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    return {
      timeOfDay,
      dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek],
      isWeekend,
      hour,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  }

  /**
   * Initialize behavioral context from user history
   */
  private initializeBehavioralContext(userHistory: UserHistory | null): BehavioralContext {
    if (!userHistory) {
      return {
        typingSpeed: 0.5,
        errorRate: 0.1,
        confidenceLevel: 0.5,
        averageHesitation: 2000,
        precision: 0.5,
        helpSeeking: 0.3,
        recentEngagement: 0.5,
        scrollFrequency: 0.3,
        typingConfidence: 0.5,
      }
    }

    return {
      typingSpeed: userHistory.averageTypingSpeed || 0.5,
      errorRate: userHistory.averageErrorRate || 0.1,
      confidenceLevel: userHistory.confidenceScore || 0.5,
      averageHesitation: userHistory.averageHesitation || 2000,
      precision: userHistory.averagePrecision || 0.5,
      helpSeeking: userHistory.helpSeekingFrequency || 0.3,
      recentEngagement: 0.5, // Will be updated as session progresses
      scrollFrequency: userHistory.averageScrollFrequency || 0.3,
      typingConfidence: userHistory.typingConfidence || 0.5,
    }
  }

  /**
   * Detect session context
   */
  private detectSessionContext(): SessionContextData {
    return {
      isFirstVisit: !this.persistenceManager.hasVisitedBefore(),
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      landingPage: typeof window !== 'undefined' ? window.location.href : '',
      utm: this.extractUTMParameters(),
    }
  }

  // Helper methods
  private getConnectionInfo(): any {
    if (typeof navigator === 'undefined') return null
    
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    return connection ? {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    } : null
  }

  private extractBrowserVersion(userAgent: string, browserName: string): string {
    // Simplified version extraction
    const regex = new RegExp(`${browserName}\\/(\\d+\\.\\d+)`, 'i')
    const match = userAgent.match(regex)
    return match ? match[1] : 'unknown'
  }

  private testLocalStorage(): boolean {
    try {
      localStorage.setItem('test', 'test')
      localStorage.removeItem('test')
      return true
    } catch {
      return false
    }
  }

  private extractUTMParameters(): Record<string, string> {
    if (typeof window === 'undefined') return {}
    
    const urlParams = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    
    for (const [key, value] of urlParams.entries()) {
      if (key.startsWith('utm_')) {
        utm[key] = value
      }
    }
    
    return utm
  }
}

/**
 * Context Analyzer for behavioral pattern recognition
 */
class ContextAnalyzer {
  private persistenceManager: PersistenceManager

  constructor(persistenceManager: PersistenceManager) {
    this.persistenceManager = persistenceManager
  }

  async analyzeEvent(event: BehaviorEvent, sessionData: SessionData): Promise<void> {
    // Update behavioral context based on event
    this.updateBehavioralContext(event, sessionData)
  }

  async analyzeAdaptationImpact(adaptation: FormAdaptation, sessionData: SessionData): Promise<void> {
    // Analyze how adaptations affect user behavior
    // This would feed into the ML training pipeline
  }

  async generateRecommendations(sessionData: SessionData): Promise<ContextualRecommendation[]> {
    const recommendations: ContextualRecommendation[] = []

    // Generate recommendations based on session context
    if (sessionData.flags.needsAssistance) {
      recommendations.push({
        type: 'error_prevention',
        priority: 'high',
        confidence: 0.8,
        reasoning: 'User showing signs of difficulty',
        suggestedParameters: {
          enableRealTimeValidation: true,
          enableInlineHelp: true,
          showHelpText: true,
        }
      })
    }

    if (sessionData.context.device.isMobile && sessionData.context.behavioral.precision < 0.5) {
      recommendations.push({
        type: 'context_switching',
        priority: 'medium',
        confidence: 0.7,
        reasoning: 'Mobile user with precision issues',
        suggestedParameters: {
          mobileOptimized: true,
          largerTouchTargets: true,
          reducedFields: true,
        }
      })
    }

    return recommendations
  }

  getContextualInsights(sessionData: SessionData): ContextualInsight[] {
    const insights: ContextualInsight[] = []

    // Generate insights based on behavioral patterns
    if (sessionData.context.behavioral.typingSpeed > 0.8) {
      insights.push({
        type: 'user_capability',
        description: 'Fast typist - optimize for efficiency',
        confidence: 0.9,
        actionable: true
      })
    }

    if (sessionData.flags.isReturningUser) {
      insights.push({
        type: 'user_loyalty',
        description: 'Returning user with established patterns',
        confidence: 0.8,
        actionable: true
      })
    }

    return insights
  }

  getBehavioralPatterns(sessionData: SessionData): BehavioralPattern[] {
    const patterns: BehavioralPattern[] = []

    // Analyze patterns from events
    const { events } = sessionData
    
    // Typing pattern analysis
    const keyEvents = events.filter(e => e.eventType === 'key_press')
    if (keyEvents.length > 10) {
      patterns.push({
        type: 'typing',
        description: this.analyzeTypingPattern(keyEvents),
        strength: 0.7,
        frequency: keyEvents.length / events.length
      })
    }

    return patterns
  }

  private updateBehavioralContext(event: BehaviorEvent, sessionData: SessionData): void {
    const context = sessionData.context.behavioral

    // Update typing metrics
    if (event.eventType === 'key_press') {
      // Update typing speed, error rate, etc.
      // This would be more sophisticated in a real implementation
    }

    // Update engagement metrics
    if (event.eventType === 'mouse_move' || event.eventType === 'scroll') {
      // Update recent engagement
      context.recentEngagement = Math.min(context.recentEngagement + 0.1, 1)
    }
  }

  private analyzeTypingPattern(keyEvents: BehaviorEvent[]): string {
    // Simplified typing pattern analysis
    const intervals = []
    for (let i = 1; i < keyEvents.length; i++) {
      intervals.push(keyEvents[i].timestamp - keyEvents[i-1].timestamp)
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    
    if (avgInterval < 100) return 'Very fast typist'
    if (avgInterval < 200) return 'Fast typist'
    if (avgInterval < 400) return 'Moderate typist'
    return 'Slow typist'
  }
}

/**
 * Persistence Manager for session and user data
 */
class PersistenceManager {
  private storagePrefix = 'adapt_'
  private useSessionStorage = true
  private useLocalStorage = true

  constructor() {
    // Test storage availability
    this.useSessionStorage = this.testStorage('sessionStorage')
    this.useLocalStorage = this.testStorage('localStorage')
  }

  getSessionData(sessionId: string): SessionData | null {
    try {
      const key = `${this.storagePrefix}session_${sessionId}`
      const data = this.useSessionStorage ? 
        sessionStorage.getItem(key) : 
        localStorage.getItem(key)
      
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  async saveSessionData(sessionData: SessionData): Promise<void> {
    try {
      const key = `${this.storagePrefix}session_${sessionData.sessionId}`
      const data = JSON.stringify(sessionData)
      
      if (this.useSessionStorage) {
        sessionStorage.setItem(key, data)
      } else if (this.useLocalStorage) {
        localStorage.setItem(key, data)
      }
    } catch (error) {
      console.warn('Failed to save session data:', error)
    }
  }

  getUserHistory(userId: string | null): UserHistory | null {
    if (!userId || !this.useLocalStorage) return null

    try {
      const key = `${this.storagePrefix}user_${userId}`
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  async updateUserHistory(userId: string, sessionData: SessionData): Promise<void> {
    if (!this.useLocalStorage) return

    try {
      const key = `${this.storagePrefix}user_${userId}`
      const existing = this.getUserHistory(userId) || {
        userId,
        sessions: [],
        averageTypingSpeed: 0,
        averageErrorRate: 0,
        confidenceScore: 0,
        averageHesitation: 0,
        averagePrecision: 0,
        helpSeekingFrequency: 0,
        averageScrollFrequency: 0,
        typingConfidence: 0,
        lastVisit: Date.now(),
        totalSessions: 0,
      }

      // Update with current session
      existing.sessions.push({
        sessionId: sessionData.sessionId,
        startTime: sessionData.startTime,
        duration: sessionData.metrics.sessionDuration,
        engagementScore: sessionData.metrics.engagementScore,
        eventCount: sessionData.metrics.totalEvents,
      })

      // Keep only recent sessions (last 10)
      existing.sessions = existing.sessions.slice(-10)
      existing.totalSessions++
      existing.lastVisit = Date.now()

      localStorage.setItem(key, JSON.stringify(existing))
    } catch (error) {
      console.warn('Failed to update user history:', error)
    }
  }

  hasVisitedBefore(): boolean {
    try {
      return !!localStorage.getItem(`${this.storagePrefix}first_visit`)
    } catch {
      return false
    }
  }

  markFirstVisit(): void {
    try {
      localStorage.setItem(`${this.storagePrefix}first_visit`, Date.now().toString())
    } catch {
      // Ignore
    }
  }

  private testStorage(storageType: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage
      storage.setItem('test', 'test')
      storage.removeItem('test')
      return true
    } catch {
      return false
    }
  }
}

// Type definitions
interface SessionData {
  sessionId: string
  userId: string | null
  startTime: number
  lastActivity: number
  events: BehaviorEvent[]
  adaptations: (FormAdaptation & { sessionContext: SessionContext })[]
  userProfile: UserProfile | null
  context: {
    device: DeviceContext
    browser: BrowserContext
    temporal: TemporalContext
    behavioral: BehavioralContext
    session: SessionContextData
  }
  metrics: {
    totalEvents: number
    totalAdaptations: number
    sessionDuration: number
    engagementScore: number
    conversionLikelihood: number
  }
  flags: {
    isReturningUser: boolean
    isHighValueSession: boolean
    needsAssistance: boolean
    riskOfAbandonment: boolean
  }
}

interface DeviceContext {
  type: string
  isMobile: boolean
  isTablet: boolean
  capabilities: Record<string, any>
}

interface BrowserContext {
  name: string
  version: string
  capabilities: Record<string, any>
}

interface TemporalContext {
  timeOfDay: string
  dayOfWeek: string
  isWeekend: boolean
  hour: number
  timezone: string
}

interface BehavioralContext {
  typingSpeed: number
  errorRate: number
  confidenceLevel: number
  averageHesitation: number
  precision: number
  helpSeeking: number
  recentEngagement: number
  scrollFrequency: number
  typingConfidence: number
}

interface SessionContextData {
  isFirstVisit: boolean
  referrer: string
  landingPage: string
  utm: Record<string, string>
}

interface SessionContext {
  timestamp: number
  sessionDuration: number
  eventCount: number
  engagementScore: number
  flags: Record<string, boolean>
}

interface EnhancedUserProfile {
  sessionId: string
  userId: string | null
  baseProfile: UserProfile | null
  sessionMetrics: any
  contextualInsights: ContextualInsight[]
  behavioralPatterns: BehavioralPattern[]
  riskFactors: string[]
  opportunities: string[]
  sessionFlags: Record<string, boolean>
}

interface ContextualRecommendation {
  type: string
  priority: 'low' | 'medium' | 'high'
  confidence: number
  reasoning: string
  suggestedParameters: Record<string, any>
}

interface ContextualInsight {
  type: string
  description: string
  confidence: number
  actionable: boolean
}

interface BehavioralPattern {
  type: string
  description: string
  strength: number
  frequency: number
}

interface UserHistory {
  userId: string
  sessions: Array<{
    sessionId: string
    startTime: number
    duration: number
    engagementScore: number
    eventCount: number
  }>
  averageTypingSpeed: number
  averageErrorRate: number
  confidenceScore: number
  averageHesitation: number
  averagePrecision: number
  helpSeekingFrequency: number
  averageScrollFrequency: number
  typingConfidence: number
  lastVisit: number
  totalSessions: number
}

export { SessionManager, ContextAnalyzer, PersistenceManager }
export type { 
  SessionData, 
  EnhancedUserProfile, 
  ContextualRecommendation,
  ContextualInsight,
  BehavioralPattern 
}