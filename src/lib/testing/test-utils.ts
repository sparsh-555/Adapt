import { BehaviorEvent, FormAdaptation, UserProfile } from '@/types'

/**
 * Testing utilities for Adapt
 */

// Mock data generators
export const mockBehaviorEvent = (overrides: Partial<BehaviorEvent> = {}): BehaviorEvent => ({
  id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  sessionId: 'test_session_123',
  formId: 'test_form_456',
  eventType: 'mouse_click',
  fieldName: 'email',
  timestamp: Date.now(),
  data: {
    x: 100,
    y: 200,
    button: 0,
  },
  userAgent: 'Mozilla/5.0 (Test Browser)',
  url: 'https://test.example.com',
  ...overrides,
})

export const mockFormAdaptation = (overrides: Partial<FormAdaptation> = {}): FormAdaptation => ({
  id: `adaptation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  sessionId: 'test_session_123',
  formId: 'test_form_456',
  adaptationType: 'progressive_disclosure',
  confidence: 0.85,
  parameters: {
    initialFields: 3,
    strategy: 'efficiency',
  },
  cssChanges: {
    '.form-field.hidden': 'display: none',
  },
  jsChanges: 'console.log("Test adaptation applied");',
  appliedAt: new Date().toISOString(),
  isActive: true,
  description: 'Test progressive disclosure adaptation',
  metadata: {
    source: 'test',
    testMode: true,
  },
  ...overrides,
})

export const mockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  sessionId: 'test_session_123',
  behaviorType: 'fast_user',
  confidenceScore: 0.75,
  characteristics: {
    averageFieldFocusTime: 2500,
    typingSpeed: 45,
    correctionFrequency: 2,
    scrollPatterns: ['top_to_bottom'],
    deviceType: 'desktop',
    navigationStyle: 'linear',
    errorPatterns: [],
    completionRate: 0.85,
  },
  updatedAt: Date.now(),
  ...overrides,
})

// Test scenarios
export const createTestScenario = {
  fastUser: (): BehaviorEvent[] => [
    mockBehaviorEvent({
      eventType: 'focus',
      fieldName: 'name',
      timestamp: Date.now() - 5000,
    }),
    mockBehaviorEvent({
      eventType: 'field_change',
      fieldName: 'name',
      timestamp: Date.now() - 4800,
      data: { value: 'John Doe' },
    }),
    mockBehaviorEvent({
      eventType: 'focus',
      fieldName: 'email',
      timestamp: Date.now() - 4000,
    }),
    mockBehaviorEvent({
      eventType: 'field_change',
      fieldName: 'email',
      timestamp: Date.now() - 3500,
      data: { value: 'john@example.com' },
    }),
  ],

  strugglingUser: (): BehaviorEvent[] => [
    mockBehaviorEvent({
      eventType: 'focus',
      fieldName: 'email',
      timestamp: Date.now() - 20000,
    }),
    mockBehaviorEvent({
      eventType: 'key_press',
      fieldName: 'email',
      timestamp: Date.now() - 18000,
      data: { key: 'j' },
    }),
    mockBehaviorEvent({
      eventType: 'key_press',
      fieldName: 'email',
      timestamp: Date.now() - 17000,
      data: { key: 'Backspace' },
    }),
    mockBehaviorEvent({
      eventType: 'key_press',
      fieldName: 'email',
      timestamp: Date.now() - 16000,
      data: { key: 'Backspace' },
    }),
    mockBehaviorEvent({
      eventType: 'field_change',
      fieldName: 'email',
      timestamp: Date.now() - 10000,
      data: { value: 'john@' },
    }),
    mockBehaviorEvent({
      eventType: 'blur',
      fieldName: 'email',
      timestamp: Date.now() - 8000,
    }),
    mockBehaviorEvent({
      eventType: 'focus',
      fieldName: 'email',
      timestamp: Date.now() - 5000,
    }),
  ],

  mobileUser: (): BehaviorEvent[] => [
    mockBehaviorEvent({
      eventType: 'scroll',
      timestamp: Date.now() - 10000,
      data: { y: 100 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
    }),
    mockBehaviorEvent({
      eventType: 'focus',
      fieldName: 'name',
      timestamp: Date.now() - 8000,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
    }),
    mockBehaviorEvent({
      eventType: 'scroll',
      timestamp: Date.now() - 6000,
      data: { y: 200 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
    }),
  ],
}

// API testing helpers
export const createTestRequest = (
  body: any,
  options: {
    method?: string
    headers?: Record<string, string>
    url?: string
  } = {}
) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'User-Agent': 'Test Agent',
    ...options.headers,
  })

  return new Request(options.url || 'http://localhost:3000/api/test', {
    method: options.method || 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

// Response validation helpers
export const validateApiResponse = {
  trackingResponse: (response: any): boolean => {
    return !!(
      response &&
      typeof response.success === 'boolean' &&
      response.data &&
      typeof response.timestamp === 'number'
    )
  },

  adaptationResponse: (adaptation: any): boolean => {
    return !!(
      adaptation &&
      adaptation.id &&
      adaptation.sessionId &&
      adaptation.formId &&
      adaptation.adaptationType &&
      typeof adaptation.confidence === 'number' &&
      adaptation.appliedAt
    )
  },

  errorResponse: (response: any): boolean => {
    return !!(
      response &&
      response.success === false &&
      response.error &&
      typeof response.timestamp === 'number'
    )
  },
}

// Performance testing utilities
export const performanceTest = {
  async measureApiCall(
    apiCall: () => Promise<any>,
    iterations: number = 10
  ): Promise<{
    averageTime: number
    minTime: number
    maxTime: number
    totalTime: number
    iterations: number
  }> {
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now()
      await apiCall()
      const end = Date.now()
      times.push(end - start)
    }

    return {
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      totalTime: times.reduce((a, b) => a + b, 0),
      iterations,
    }
  },

  async loadTest(
    apiCall: () => Promise<any>,
    concurrency: number = 5,
    duration: number = 10000 // 10 seconds
  ): Promise<{
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    requestsPerSecond: number
  }> {
    const startTime = Date.now()
    const results: { success: boolean; time: number }[] = []
    const promises: Promise<void>[] = []

    const makeRequest = async (): Promise<void> => {
      while (Date.now() - startTime < duration) {
        const requestStart = Date.now()
        try {
          await apiCall()
          results.push({
            success: true,
            time: Date.now() - requestStart,
          })
        } catch (error) {
          results.push({
            success: false,
            time: Date.now() - requestStart,
          })
        }
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    // Start concurrent workers
    for (let i = 0; i < concurrency; i++) {
      promises.push(makeRequest())
    }

    await Promise.all(promises)

    const successfulRequests = results.filter(r => r.success).length
    const failedRequests = results.filter(r => !r.success).length
    const totalTime = Date.now() - startTime

    return {
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageResponseTime: results.reduce((sum, r) => sum + r.time, 0) / results.length,
      requestsPerSecond: (results.length / totalTime) * 1000,
    }
  },
}

// Environment testing utilities
export const environmentTest = {
  validateEnvironment: (): {
    valid: boolean
    missing: string[]
    warnings: string[]
  } => {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ]

    const optional = [
      'ML_CONFIDENCE_THRESHOLD',
      'MAX_ADAPTATIONS_PER_SESSION',
      'ENABLE_ML_INFERENCE',
    ]

    const missing: string[] = []
    const warnings: string[] = []

    required.forEach(key => {
      if (!process.env[key]) {
        missing.push(key)
      }
    })

    optional.forEach(key => {
      if (!process.env[key]) {
        warnings.push(`Optional environment variable ${key} not set`)
      }
    })

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    }
  },

  testDatabaseConnection: async (): Promise<{
    connected: boolean
    error?: string
    responseTime: number
  }> => {
    const start = Date.now()
    
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      
      return {
        connected: data.checks?.database?.status === 'healthy',
        error: data.checks?.database?.error,
        responseTime: Date.now() - start,
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        responseTime: Date.now() - start,
      }
    }
  },
}

// Debug utilities
export const debugUtils = {
  logBehaviorSequence: (events: BehaviorEvent[]): void => {
    console.log('Behavior Event Sequence:')
    events
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((event, index) => {
        console.log(`${index + 1}. ${event.eventType} on ${event.fieldName || 'page'} at ${new Date(event.timestamp).toLocaleTimeString()}`)
      })
  },

  analyzeSessionPattern: (events: BehaviorEvent[]): {
    duration: number
    eventCount: number
    fieldsInteracted: number
    errorRate: number
    avgTimeBetweenEvents: number
  } => {
    if (events.length === 0) {
      return {
        duration: 0,
        eventCount: 0,
        fieldsInteracted: 0,
        errorRate: 0,
        avgTimeBetweenEvents: 0,
      }
    }

    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp)
    const firstEvent = sortedEvents[0]
    const lastEvent = sortedEvents[sortedEvents.length - 1]
    if (!firstEvent || !lastEvent) return {
      duration: 0,
      eventCount: 0,
      fieldsInteracted: 0,
      errorRate: 0,
      avgTimeBetweenEvents: 0,
    }
    const duration = lastEvent.timestamp - firstEvent.timestamp
    const fieldsInteracted = new Set(events.map(e => e.fieldName).filter(Boolean)).size
    const errorEvents = events.filter(e => 
      e.eventType === 'key_press' && e.data?.key === 'Backspace'
    ).length
    const errorRate = errorEvents / events.length

    let totalTimeBetween = 0
    for (let i = 1; i < sortedEvents.length; i++) {
      const current = sortedEvents[i]
      const previous = sortedEvents[i - 1]
      if (current && previous) {
        totalTimeBetween += current.timestamp - previous.timestamp
      }
    }
    const avgTimeBetweenEvents = totalTimeBetween / (sortedEvents.length - 1)

    return {
      duration,
      eventCount: events.length,
      fieldsInteracted,
      errorRate,
      avgTimeBetweenEvents,
    }
  },
}

export default {
  mockBehaviorEvent,
  mockFormAdaptation,
  mockUserProfile,
  createTestScenario,
  createTestRequest,
  validateApiResponse,
  performanceTest,
  environmentTest,
  debugUtils,
}