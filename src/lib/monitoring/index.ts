// Import and export error tracking functionality
import { initializeErrorTracking, trackMetric, trackError, getErrorTracker } from './error-tracker'

export {
  ErrorTracker,
  initializeErrorTracking,
  getErrorTracker,
  trackError,
  trackMetric,
  withErrorTracking,
} from './error-tracker'

export type {
  ErrorContext,
  PerformanceMetric,
} from './error-tracker'

// Re-export testing utilities for development
export * as testUtils from '../testing/test-utils'

// Monitoring configuration
export const MonitoringConfig = {
  // Error tracking
  errorTracking: {
    enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_ERROR_TRACKING === 'true',
    endpoint: '/api/monitoring/errors',
    flushInterval: 30000, // 30 seconds
    maxQueueSize: 100,
  },
  
  // Performance monitoring
  performance: {
    enabled: true,
    trackApiCalls: true,
    trackMLInference: true,
    trackAdaptations: true,
    trackUserBehavior: true,
    trackRealtime: true,
  },
  
  // Health checks
  healthCheck: {
    endpoint: '/api/health',
    interval: 60000, // 1 minute
    timeout: 5000, // 5 seconds
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.NODE_ENV === 'development',
    enableRemote: process.env.NODE_ENV === 'production',
  },
}

// Initialize monitoring for client-side usage
export function initializeMonitoring(sessionId: string): void {
  if (typeof window === 'undefined') return

  // Initialize error tracking
  initializeErrorTracking({
    enabled: MonitoringConfig.errorTracking.enabled,
    endpoint: MonitoringConfig.errorTracking.endpoint,
    sessionId,
    flushInterval: MonitoringConfig.errorTracking.flushInterval,
  })

  // Track page load performance
  if (MonitoringConfig.performance.enabled) {
    // Track initial page load
    window.addEventListener('load', () => {
      if (performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
        trackMetric({
          name: 'page_load_time',
          value: loadTime,
          unit: 'ms',
          tags: {
            page: window.location.pathname,
            session_id: sessionId,
          },
        })
      }
    })

    // Track navigation timing
    if ('navigation' in performance && 'getEntriesByType' in performance) {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (navEntries.length > 0) {
        const nav = navEntries[0]
        
        if (nav) {
          trackMetric({
            name: 'dom_content_loaded',
            value: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
            unit: 'ms',
            tags: { session_id: sessionId },
          })
          
          trackMetric({
            name: 'first_byte_time',
            value: nav.responseStart - nav.requestStart,
            unit: 'ms',
            tags: { session_id: sessionId },
          })
        }
      }
    }
  }

  // Setup periodic health checks
  if (MonitoringConfig.healthCheck.interval > 0) {
    setInterval(async () => {
      try {
        const start = Date.now()
        const response = await fetch(MonitoringConfig.healthCheck.endpoint, {
          signal: AbortSignal.timeout(MonitoringConfig.healthCheck.timeout),
        })
        
        trackMetric({
          name: 'health_check_response_time',
          value: Date.now() - start,
          unit: 'ms',
          tags: {
            status: response.ok ? 'healthy' : 'unhealthy',
            session_id: sessionId,
          },
        })
      } catch (error) {
        trackError(error as Error, {
          severity: 'medium',
          tags: { component: 'health_check' },
        })
      }
    }, MonitoringConfig.healthCheck.interval)
  }
}

// Utility function to create a monitoring wrapper for API calls
export function createMonitoredFetch(_sessionId: string) {
  return async function monitoredFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method || 'GET'
    const start = Date.now()
    
    try {
      const response = await fetch(input, init)
      const duration = Date.now() - start
      
      // Track API call performance
      getErrorTracker()?.trackApiCall(
        url,
        method,
        duration,
        response.status,
        response.ok ? undefined : new Error(`HTTP ${response.status}`)
      )
      
      return response
    } catch (error) {
      const duration = Date.now() - start
      
      // Track failed API call
      getErrorTracker()?.trackApiCall(
        url,
        method,
        duration,
        0,
        error as Error
      )
      
      throw error
    }
  }
}

// Browser performance observer setup
export function setupPerformanceObserver(sessionId: string): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

  try {
    // Observe long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          trackMetric({
            name: 'long_task_duration',
            value: entry.duration,
            unit: 'ms',
            tags: {
              task_name: entry.name,
              session_id: sessionId,
            },
          })
        }
      }
    })
    longTaskObserver.observe({ entryTypes: ['longtask'] })

    // Observe largest contentful paint
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trackMetric({
          name: 'largest_contentful_paint',
          value: entry.startTime,
          unit: 'ms',
          tags: { session_id: sessionId },
        })
      }
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

    // Observe first input delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as any // First Input Delay entry
        trackMetric({
          name: 'first_input_delay',
          value: fidEntry.processingStart - fidEntry.startTime,
          unit: 'ms',
          tags: { session_id: sessionId },
        })
      }
    })
    fidObserver.observe({ entryTypes: ['first-input'] })

  } catch (error) {
    console.warn('Performance observer setup failed:', error)
  }
}

// Export monitoring utilities
export const monitoring = {
  initialize: initializeMonitoring,
  createMonitoredFetch,
  setupPerformanceObserver,
  config: MonitoringConfig,
}

export default monitoring