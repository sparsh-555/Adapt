import { BehaviorEvent, UserProfile } from '@/types'
import { debounce } from '@/utils'

export interface BehaviorPattern {
  type: 'hesitation' | 'error_prone' | 'fast_user' | 'mobile_user' | 'accessibility_user' | 'repeat_visitor'
  confidence: number
  evidence: string[]
  recommendations: string[]
}

export interface SessionAnalysis {
  sessionId: string
  userDifficulty: 'low' | 'medium' | 'high'
  engagementLevel: 'low' | 'medium' | 'high'
  completionLikelihood: number
  identifiedPatterns: BehaviorPattern[]
  riskFactors: string[]
  strengths: string[]
  summary: string
}

export interface FieldAnalysis {
  fieldName: string
  timeSpent: number
  errorCount: number
  focusCount: number
  abandonmentRate: number
  difficultyScore: number
  userStruggle: boolean
}

/**
 * Analyzes user behavior patterns to identify optimization opportunities
 */
export class BehaviorAnalyzer {
  private patterns: Map<string, BehaviorPattern[]> = new Map()
  private sessionAnalytics: Map<string, SessionAnalysis> = new Map()
  
  /**
   * Analyze user behavior and identify patterns
   */
  analyzeSession(
    sessionId: string,
    events: BehaviorEvent[],
    userProfile?: UserProfile
  ): SessionAnalysis {
    const patterns = this.identifyBehaviorPatterns(events, userProfile)
    const fieldAnalyses = this.analyzeFieldInteractions(events)
    const engagement = this.calculateEngagementLevel(events)
    const difficulty = this.assessUserDifficulty(events, patterns)
    const completion = this.predictCompletionLikelihood(events, patterns, fieldAnalyses)
    
    const analysis: SessionAnalysis = {
      sessionId,
      userDifficulty: difficulty,
      engagementLevel: engagement,
      completionLikelihood: completion,
      identifiedPatterns: patterns,
      riskFactors: this.identifyRiskFactors(events, patterns),
      strengths: this.identifyUserStrengths(events, patterns),
      summary: this.generateAnalysisSummary(patterns, difficulty, engagement, completion),
    }
    
    this.sessionAnalytics.set(sessionId, analysis)
    this.patterns.set(sessionId, patterns)
    
    return analysis
  }

  /**
   * Identify behavior patterns from events
   */
  private identifyBehaviorPatterns(
    events: BehaviorEvent[],
    userProfile?: UserProfile
  ): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = []
    
    // Analyze hesitation patterns
    const hesitationPattern = this.detectHesitationPattern(events)
    if (hesitationPattern) patterns.push(hesitationPattern)
    
    // Analyze error patterns
    const errorPattern = this.detectErrorPattern(events)
    if (errorPattern) patterns.push(errorPattern)
    
    // Analyze speed patterns
    const speedPattern = this.detectSpeedPattern(events)
    if (speedPattern) patterns.push(speedPattern)
    
    // Analyze device patterns
    const devicePattern = this.detectDevicePattern(events)
    if (devicePattern) patterns.push(devicePattern)
    
    // Analyze accessibility patterns
    const accessibilityPattern = this.detectAccessibilityPattern(events)
    if (accessibilityPattern) patterns.push(accessibilityPattern)
    
    // Analyze return visitor patterns
    const returnPattern = this.detectReturnVisitorPattern(userProfile)
    if (returnPattern) patterns.push(returnPattern)
    
    return patterns
  }

  /**
   * Detect hesitation patterns
   */
  private detectHesitationPattern(events: BehaviorEvent[]): BehaviorPattern | null {
    const focusEvents = events.filter(e => e.eventType === 'focus')
    const inputEvents = events.filter(e => e.eventType === 'field_change')
    
    if (focusEvents.length === 0) return null
    
    let totalHesitationTime = 0
    let hesitationCount = 0
    
    focusEvents.forEach(focusEvent => {
      const nextInput = inputEvents.find(
        input => input.fieldName === focusEvent.fieldName && 
        input.timestamp > focusEvent.timestamp
      )
      
      if (nextInput) {
        const hesitationTime = nextInput.timestamp - focusEvent.timestamp
        if (hesitationTime > 3000) { // 3+ seconds hesitation
          totalHesitationTime += hesitationTime
          hesitationCount++
        }
      }
    })
    
    const avgHesitation = hesitationCount > 0 ? totalHesitationTime / hesitationCount : 0
    const hesitationRate = hesitationCount / focusEvents.length
    
    if (hesitationRate > 0.3 || avgHesitation > 5000) {
      return {
        type: 'hesitation',
        confidence: Math.min(hesitationRate * 2, 1),
        evidence: [
          `${hesitationCount} fields with significant hesitation`,
          `Average hesitation time: ${Math.round(avgHesitation / 1000)}s`,
          `Hesitation rate: ${Math.round(hesitationRate * 100)}%`,
        ],
        recommendations: [
          'Add contextual help and examples',
          'Implement progressive disclosure',
          'Provide inline validation and guidance',
          'Consider field reordering based on difficulty',
        ],
      }
    }
    
    return null
  }

  /**
   * Detect error-prone patterns
   */
  private detectErrorPattern(events: BehaviorEvent[]): BehaviorPattern | null {
    const keyEvents = events.filter(e => e.eventType === 'key_press')
    const backspaceEvents = keyEvents.filter(e => e.data.key === 'Backspace')
    const totalInputs = keyEvents.length
    
    if (totalInputs === 0) return null
    
    const errorRate = backspaceEvents.length / totalInputs
    const consecutiveBackspaces = this.findConsecutiveBackspaces(keyEvents)
    
    if (errorRate > 0.15 || consecutiveBackspaces > 3) {
      return {
        type: 'error_prone',
        confidence: Math.min(errorRate * 3, 1),
        evidence: [
          `Error rate: ${Math.round(errorRate * 100)}%`,
          `${backspaceEvents.length} corrections out of ${totalInputs} inputs`,
          `Max consecutive backspaces: ${consecutiveBackspaces}`,
        ],
        recommendations: [
          'Enable real-time validation',
          'Add input masking for formatted fields',
          'Provide autocomplete suggestions',
          'Add clear format examples',
        ],
      }
    }
    
    return null
  }

  /**
   * Detect fast user patterns
   */
  private detectSpeedPattern(events: BehaviorEvent[]): BehaviorPattern | null {
    const inputEvents = events.filter(e => e.eventType === 'field_change')
    
    if (inputEvents.length < 3) return null
    
    const intervals = []
    for (let i = 1; i < inputEvents.length; i++) {
      intervals.push(inputEvents[i].timestamp - inputEvents[i - 1].timestamp)
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const fastIntervals = intervals.filter(interval => interval < 1000).length
    const fastRate = fastIntervals / intervals.length
    
    if (avgInterval < 2000 && fastRate > 0.6) {
      return {
        type: 'fast_user',
        confidence: Math.min(fastRate * 1.5, 1),
        evidence: [
          `Average field transition: ${Math.round(avgInterval / 1000)}s`,
          `${Math.round(fastRate * 100)}% of transitions under 1s`,
          `Appears to be an experienced user`,
        ],
        recommendations: [
          'Minimize unnecessary fields',
          'Enable keyboard shortcuts',
          'Reduce validation delays',
          'Optimize for efficiency over guidance',
        ],
      }
    }
    
    return null
  }

  /**
   * Detect mobile device patterns
   */
  private detectDevicePattern(events: BehaviorEvent[]): BehaviorPattern | null {
    if (events.length === 0) return null
    
    const userAgent = events[0].userAgent
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent)
    const isTablet = /tablet|ipad/i.test(userAgent)
    
    const scrollEvents = events.filter(e => e.eventType === 'scroll')
    const touchIndicators = events.filter(e => 
      e.data && (e.data.touchType || e.data.pointerType === 'touch')
    )
    
    if (isMobile || touchIndicators.length > 0 || scrollEvents.length > events.length * 0.1) {
      return {
        type: 'mobile_user',
        confidence: isMobile ? 0.9 : 0.6,
        evidence: [
          `Device: ${isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Touch-enabled'}`,
          `${scrollEvents.length} scroll events`,
          `${touchIndicators.length} touch interactions`,
        ],
        recommendations: [
          'Optimize field sizes for touch',
          'Implement mobile-friendly validation',
          'Use appropriate input types (tel, email, etc.)',
          'Minimize typing requirements',
        ],
      }
    }
    
    return null
  }

  /**
   * Detect accessibility patterns
   */
  private detectAccessibilityPattern(events: BehaviorEvent[]): BehaviorPattern | null {
    const keyEvents = events.filter(e => e.eventType === 'key_press')
    const tabNavigations = keyEvents.filter(e => e.data.key === 'Tab')
    const mouseEvents = events.filter(e => e.eventType === 'mouse_move')
    
    // High tab usage with low mouse usage might indicate accessibility needs
    const tabRate = keyEvents.length > 0 ? tabNavigations.length / keyEvents.length : 0
    const mouseToKeyRatio = keyEvents.length > 0 ? mouseEvents.length / keyEvents.length : 1
    
    if (tabRate > 0.3 && mouseToKeyRatio < 2) {
      return {
        type: 'accessibility_user',
        confidence: Math.min(tabRate * 2, 0.8),
        evidence: [
          `High keyboard navigation usage: ${Math.round(tabRate * 100)}%`,
          `Low mouse-to-key ratio: ${Math.round(mouseToKeyRatio * 100)}%`,
          `${tabNavigations.length} tab navigations`,
        ],
        recommendations: [
          'Ensure proper tab order',
          'Add clear focus indicators',
          'Provide skip links',
          'Use semantic HTML and ARIA labels',
        ],
      }
    }
    
    return null
  }

  /**
   * Detect return visitor patterns
   */
  private detectReturnVisitorPattern(userProfile?: UserProfile): BehaviorPattern | null {
    if (!userProfile || !userProfile.sessionCount) return null
    
    if (userProfile.sessionCount > 1) {
      const confidence = Math.min(userProfile.sessionCount / 5, 0.9)
      
      return {
        type: 'repeat_visitor',
        confidence,
        evidence: [
          `${userProfile.sessionCount} previous sessions`,
          `First visit: ${new Date(userProfile.createdAt).toLocaleDateString()}`,
          `Returning user with established patterns`,
        ],
        recommendations: [
          'Pre-fill known information',
          'Show personalized adaptations',
          'Reduce onboarding elements',
          'Focus on conversion optimization',
        ],
      }
    }
    
    return null
  }

  /**
   * Analyze field-level interactions
   */
  private analyzeFieldInteractions(events: BehaviorEvent[]): FieldAnalysis[] {
    const fieldMap = new Map<string, FieldAnalysis>()
    
    events.forEach(event => {
      if (!event.fieldName) return
      
      if (!fieldMap.has(event.fieldName)) {
        fieldMap.set(event.fieldName, {
          fieldName: event.fieldName,
          timeSpent: 0,
          errorCount: 0,
          focusCount: 0,
          abandonmentRate: 0,
          difficultyScore: 0,
          userStruggle: false,
        })
      }
      
      const analysis = fieldMap.get(event.fieldName)!
      
      switch (event.eventType) {
        case 'focus':
          analysis.focusCount++
          break
        case 'key_press':
          if (event.data.key === 'Backspace') {
            analysis.errorCount++
          }
          break
      }
    })
    
    // Calculate difficulty scores and time spent
    fieldMap.forEach((analysis, fieldName) => {
      const fieldEvents = events.filter(e => e.fieldName === fieldName)
      
      if (fieldEvents.length > 0) {
        const firstEvent = fieldEvents[0]
        const lastEvent = fieldEvents[fieldEvents.length - 1]
        analysis.timeSpent = lastEvent.timestamp - firstEvent.timestamp
        
        // Calculate difficulty score based on multiple factors
        analysis.difficultyScore = this.calculateFieldDifficulty(
          analysis.timeSpent,
          analysis.errorCount,
          analysis.focusCount,
          fieldEvents.length
        )
        
        analysis.userStruggle = analysis.difficultyScore > 0.6
      }
    })
    
    return Array.from(fieldMap.values())
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagementLevel(events: BehaviorEvent[]): 'low' | 'medium' | 'high' {
    if (events.length === 0) return 'low'
    
    const sessionDuration = events[events.length - 1].timestamp - events[0].timestamp
    const eventsPerMinute = (events.length / sessionDuration) * 60000
    const interactionTypes = new Set(events.map(e => e.eventType)).size
    
    if (eventsPerMinute > 30 && interactionTypes >= 4) return 'high'
    if (eventsPerMinute > 15 && interactionTypes >= 3) return 'medium'
    return 'low'
  }

  /**
   * Assess user difficulty level
   */
  private assessUserDifficulty(
    events: BehaviorEvent[],
    patterns: BehaviorPattern[]
  ): 'low' | 'medium' | 'high' {
    let difficultyScore = 0
    
    // Add score based on identified patterns
    patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'hesitation':
          difficultyScore += pattern.confidence * 0.4
          break
        case 'error_prone':
          difficultyScore += pattern.confidence * 0.3
          break
        case 'fast_user':
          difficultyScore -= pattern.confidence * 0.2 // Fast users have lower difficulty
          break
        case 'accessibility_user':
          difficultyScore += pattern.confidence * 0.2
          break
      }
    })
    
    // Add score based on event patterns
    const keyEvents = events.filter(e => e.eventType === 'key_press')
    const backspaceEvents = keyEvents.filter(e => e.data.key === 'Backspace')
    const errorRate = keyEvents.length > 0 ? backspaceEvents.length / keyEvents.length : 0
    
    difficultyScore += errorRate * 0.3
    
    if (difficultyScore > 0.6) return 'high'
    if (difficultyScore > 0.3) return 'medium'
    return 'low'
  }

  /**
   * Predict completion likelihood
   */
  private predictCompletionLikelihood(
    events: BehaviorEvent[],
    patterns: BehaviorPattern[],
    fieldAnalyses: FieldAnalysis[]
  ): number {
    let likelihood = 0.5 // Base likelihood
    
    // Adjust based on patterns
    patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'hesitation':
          likelihood -= pattern.confidence * 0.2
          break
        case 'error_prone':
          likelihood -= pattern.confidence * 0.15
          break
        case 'fast_user':
          likelihood += pattern.confidence * 0.2
          break
        case 'repeat_visitor':
          likelihood += pattern.confidence * 0.3
          break
      }
    })
    
    // Adjust based on field struggles
    const strugglingFields = fieldAnalyses.filter(f => f.userStruggle).length
    const totalFields = fieldAnalyses.length
    
    if (totalFields > 0) {
      const struggleRate = strugglingFields / totalFields
      likelihood -= struggleRate * 0.3
    }
    
    // Adjust based on engagement
    const sessionDuration = events.length > 0 ? 
      events[events.length - 1].timestamp - events[0].timestamp : 0
    
    if (sessionDuration > 300000) { // More than 5 minutes
      likelihood -= 0.1 // Longer sessions might indicate struggle
    }
    
    return Math.max(0, Math.min(1, likelihood))
  }

  // Helper methods
  private findConsecutiveBackspaces(keyEvents: BehaviorEvent[]): number {
    let maxConsecutive = 0
    let currentConsecutive = 0
    
    keyEvents.forEach(event => {
      if (event.data.key === 'Backspace') {
        currentConsecutive++
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
      } else {
        currentConsecutive = 0
      }
    })
    
    return maxConsecutive
  }

  private calculateFieldDifficulty(
    timeSpent: number,
    errorCount: number,
    focusCount: number,
    totalEvents: number
  ): number {
    // Normalize values to 0-1 scale
    const timeScore = Math.min(timeSpent / 30000, 1) // 30s max
    const errorScore = Math.min(errorCount / 10, 1) // 10 errors max
    const focusScore = Math.min(focusCount / 5, 1) // 5 focuses max
    const eventScore = Math.min(totalEvents / 50, 1) // 50 events max
    
    // Weighted combination
    return (timeScore * 0.3 + errorScore * 0.4 + focusScore * 0.2 + eventScore * 0.1)
  }

  private identifyRiskFactors(
    events: BehaviorEvent[],
    patterns: BehaviorPattern[]
  ): string[] {
    const riskFactors: string[] = []
    
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.5) {
        switch (pattern.type) {
          case 'hesitation':
            riskFactors.push('User showing significant hesitation on multiple fields')
            break
          case 'error_prone':
            riskFactors.push('High error rate indicates potential form abandonment')
            break
        }
      }
    })
    
    const sessionDuration = events.length > 0 ? 
      events[events.length - 1].timestamp - events[0].timestamp : 0
    
    if (sessionDuration > 600000) { // 10+ minutes
      riskFactors.push('Extended session duration suggests user difficulty')
    }
    
    return riskFactors
  }

  private identifyUserStrengths(
    events: BehaviorEvent[],
    patterns: BehaviorPattern[]
  ): string[] {
    const strengths: string[] = []
    
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.5) {
        switch (pattern.type) {
          case 'fast_user':
            strengths.push('Efficient user with good form completion skills')
            break
          case 'repeat_visitor':
            strengths.push('Returning user with established trust')
            break
        }
      }
    })
    
    const inputEvents = events.filter(e => e.eventType === 'field_change')
    if (inputEvents.length > 0) {
      const avgTime = events.length > 1 ? 
        (events[events.length - 1].timestamp - events[0].timestamp) / inputEvents.length : 0
      
      if (avgTime < 5000) { // Less than 5s per field
        strengths.push('Quick field completion indicates user confidence')
      }
    }
    
    return strengths
  }

  private generateAnalysisSummary(
    patterns: BehaviorPattern[],
    difficulty: string,
    engagement: string,
    completion: number
  ): string {
    const mainPattern = patterns.find(p => p.confidence > 0.6)
    const completionPercent = Math.round(completion * 100)
    
    let summary = `User shows ${difficulty} difficulty level with ${engagement} engagement. `
    summary += `Completion likelihood: ${completionPercent}%. `
    
    if (mainPattern) {
      switch (mainPattern.type) {
        case 'hesitation':
          summary += 'Primary concern: User hesitation suggests need for additional guidance.'
          break
        case 'error_prone':
          summary += 'Primary concern: High error rate indicates validation improvements needed.'
          break
        case 'fast_user':
          summary += 'Positive indicator: Experienced user moving efficiently through form.'
          break
        case 'mobile_user':
          summary += 'Context: Mobile user requiring touch-optimized experience.'
          break
        case 'accessibility_user':
          summary += 'Context: Accessibility-focused user requiring keyboard-friendly design.'
          break
        case 'repeat_visitor':
          summary += 'Positive indicator: Returning user with established patterns.'
          break
      }
    }
    
    return summary
  }

  /**
   * Get session analysis
   */
  getSessionAnalysis(sessionId: string): SessionAnalysis | null {
    return this.sessionAnalytics.get(sessionId) || null
  }

  /**
   * Get behavior patterns for a session
   */
  getBehaviorPatterns(sessionId: string): BehaviorPattern[] {
    return this.patterns.get(sessionId) || []
  }

  /**
   * Clear analytics data for a session
   */
  clearSessionData(sessionId: string): void {
    this.sessionAnalytics.delete(sessionId)
    this.patterns.delete(sessionId)
  }
}

export default BehaviorAnalyzer