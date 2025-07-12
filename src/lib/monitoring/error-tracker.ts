import { createAdaptError } from '@/utils'

export interface ErrorContext {
  userId?: string
  sessionId?: string
  formId?: string
  userAgent?: string
  url?: string
  timestamp?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  tags?: Record<string, string>
  extra?: Record<string, any>
}

export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percent'
  timestamp: number
  tags?: Record<string, string>
}

/**
 * Error tracking and monitoring for Adapt
 */
export class ErrorTracker {
  private isEnabled: boolean
  private endpoint: string
  private sessionId: string
  private errorQueue: Array<{ error: Error; context: ErrorContext }> = []
  private metricsQueue: PerformanceMetric[] = []
  private flushInterval: NodeJS.Timeout | null = null

  constructor(config: {
    enabled: boolean
    endpoint?: string
    sessionId: string
    flushInterval?: number
  }) {
    this.isEnabled = config.enabled
    this.endpoint = config.endpoint || '/api/monitoring/errors'
    this.sessionId = config.sessionId
    
    if (this.isEnabled) {
      this.startPeriodicFlush(config.flushInterval || 30000) // 30 seconds
      this.setupGlobalErrorHandlers()
    }
  }

  /**
   * Track an error with context
   */
  trackError(error: Error, context: Partial<ErrorContext> = {}): void {
    if (!this.isEnabled) return

    const fullContext: ErrorContext = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      severity: 'medium',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...context,
    }

    this.errorQueue.push({ error, context: fullContext })

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Adapt Error:', {
        message: error.message,
        stack: error.stack,
        context: fullContext,
      })
    }

    // Flush immediately for critical errors
    if (fullContext.severity === 'critical') {
      this.flush()
    }
  }

  /**
   * Track performance metrics
   */
  trackMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    if (!this.isEnabled) return

    this.metricsQueue.push({
      ...metric,
      timestamp: Date.now(),
    })
  }

  /**
   * Track API response times
   */
  trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    error?: Error
  ): void {
    if (!this.isEnabled) return

    // Track response time
    this.trackMetric({
      name: 'api_response_time',
      value: duration,
      unit: 'ms',
      tags: {
        endpoint,
        method,
        status: status.toString(),
      },
    })

    // Track error rate
    this.trackMetric({
      name: 'api_error_rate',
      value: error ? 1 : 0,
      unit: 'count',
      tags: {
        endpoint,
        method,
        status: status.toString(),
      },
    })

    // Track error if present
    if (error) {
      this.trackError(error, {
        severity: status >= 500 ? 'high' : 'medium',
        tags: {
          endpoint,
          method,
          status: status.toString(),
        },
      })
    }
  }

  /**
   * Track ML inference performance
   */
  trackMLInference(
    operation: string,
    duration: number,
    success: boolean,
    confidence?: number,
    error?: Error
  ): void {
    if (!this.isEnabled) return

    this.trackMetric({
      name: 'ml_inference_time',
      value: duration,
      unit: 'ms',
      tags: {
        operation,
        success: success.toString(),
      },
    })

    if (confidence !== undefined) {
      this.trackMetric({
        name: 'ml_confidence',
        value: confidence,
        unit: 'percent',
        tags: { operation },
      })
    }

    if (error) {
      this.trackError(error, {
        severity: 'medium',
        tags: {
          operation,
          component: 'ml_inference',
        },
      })
    }
  }

  /**
   * Track form adaptation performance
   */
  trackAdaptation(
    adaptationType: string,
    confidence: number,
    processingTime: number,
    success: boolean
  ): void {
    if (!this.isEnabled) return

    this.trackMetric({
      name: 'adaptation_processing_time',
      value: processingTime,
      unit: 'ms',
      tags: {
        adaptation_type: adaptationType,
        success: success.toString(),
      },
    })

    this.trackMetric({
      name: 'adaptation_confidence',
      value: confidence * 100,
      unit: 'percent',
      tags: { adaptation_type: adaptationType },
    })

    this.trackMetric({
      name: 'adaptation_generated',
      value: 1,
      unit: 'count',
      tags: {
        adaptation_type: adaptationType,
        success: success.toString(),
      },
    })
  }

  /**
   * Track user behavior metrics
   */
  trackUserBehavior(
    eventType: string,
    value: number,
    unit: PerformanceMetric['unit'],
    tags: Record<string, string> = {}
  ): void {
    if (!this.isEnabled) return

    this.trackMetric({
      name: `user_behavior_${eventType}`,
      value,
      unit,
      tags: {
        session_id: this.sessionId,
        ...tags,
      },
    })
  }

  /**
   * Track real-time connection health
   */
  trackRealtimeHealth(
    connectionType: 'websocket' | 'supabase',
    status: 'connected' | 'disconnected' | 'error',
    latency?: number
  ): void {
    if (!this.isEnabled) return

    this.trackMetric({
      name: 'realtime_connection_status',
      value: status === 'connected' ? 1 : 0,
      unit: 'count',
      tags: {
        connection_type: connectionType,
        status,
      },
    })

    if (latency !== undefined) {
      this.trackMetric({
        name: 'realtime_latency',
        value: latency,
        unit: 'ms',
        tags: { connection_type: connectionType },
      })
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          severity: 'high',
          tags: { type: 'unhandled_promise_rejection' },
        }
      )
    })

    // Catch global errors
    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message), {
        severity: 'high',
        tags: {
          type: 'global_error',
          filename: event.filename,
          lineno: event.lineno?.toString(),
          colno: event.colno?.toString(),
        },
      })
    })

    // Track console errors
    const originalConsoleError = console.error
    console.error = (...args) => {
      originalConsoleError.apply(console, args)
      
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ')
      
      this.trackError(new Error(`Console Error: ${message}`), {
        severity: 'low',
        tags: { type: 'console_error' },
      })
    }
  }

  /**
   * Start periodic flushing of queued data
   */
  private startPeriodicFlush(interval: number): void {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, interval)
  }

  /**
   * Flush queued errors and metrics
   */
  async flush(): Promise<void> {
    if (!this.isEnabled || (this.errorQueue.length === 0 && this.metricsQueue.length === 0)) {
      return
    }

    const errors = [...this.errorQueue]
    const metrics = [...this.metricsQueue]
    
    // Clear queues
    this.errorQueue = []
    this.metricsQueue = []

    try {
      await this.sendToEndpoint({
        errors: errors.map(({ error, context }) => ({
          message: error.message,
          stack: error.stack,
          name: error.name,
          context,
        })),
        metrics,
        timestamp: Date.now(),
        sessionId: this.sessionId,
      })
    } catch (error) {
      // Re-queue failed items (up to a limit)
      if (errors.length < 100) {
        this.errorQueue.unshift(...errors)
      }
      if (metrics.length < 100) {
        this.metricsQueue.unshift(...metrics)
      }
      
      console.error('Failed to send monitoring data:', error)
    }
  }

  /**
   * Send data to monitoring endpoint
   */
  private async sendToEndpoint(data: any): Promise<void> {
    if (typeof fetch === 'undefined') return

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Failed to send monitoring data: ${response.status}`)
    }
  }

  /**
   * Stop error tracking and cleanup
   */
  dispose(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    
    // Final flush
    this.flush()
  }

  /**
   * Get current error and metric counts
   */
  getQueueStats(): {
    errorCount: number
    metricCount: number
  } {
    return {
      errorCount: this.errorQueue.length,
      metricCount: this.metricsQueue.length,
    }
  }
}

// Global error tracker instance
let globalErrorTracker: ErrorTracker | null = null

/**
 * Initialize global error tracking
 */
export function initializeErrorTracking(config: {
  enabled: boolean
  endpoint?: string
  sessionId: string
  flushInterval?: number
}): ErrorTracker {
  if (globalErrorTracker) {
    globalErrorTracker.dispose()
  }
  
  globalErrorTracker = new ErrorTracker(config)
  return globalErrorTracker
}

/**
 * Get the global error tracker instance
 */
export function getErrorTracker(): ErrorTracker | null {
  return globalErrorTracker
}

/**
 * Utility function to track errors with automatic context
 */
export function trackError(error: Error, context?: Partial<ErrorContext>): void {
  globalErrorTracker?.trackError(error, context)
}

/**
 * Utility function to track metrics
 */
export function trackMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
  globalErrorTracker?.trackMetric(metric)
}

/**
 * Higher-order function to automatically track function performance
 */
export function withErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  options: {
    trackPerformance?: boolean
    severity?: ErrorContext['severity']
    tags?: Record<string, string>
  } = {}
): T {
  return ((...args: any[]) => {
    const startTime = Date.now()
    
    try {
      const result = fn(...args)
      
      // Handle async functions
      if (result && typeof result.then === 'function') {
        return result
          .then((value: any) => {
            if (options.trackPerformance) {
              trackMetric({
                name: `function_duration`,
                value: Date.now() - startTime,
                unit: 'ms',
                tags: { function_name: name, success: 'true', ...options.tags },
              })
            }
            return value
          })
          .catch((error: Error) => {
            trackError(error, {
              severity: options.severity || 'medium',
              tags: { function_name: name, ...options.tags },
            })
            
            if (options.trackPerformance) {
              trackMetric({
                name: `function_duration`,
                value: Date.now() - startTime,
                unit: 'ms',
                tags: { function_name: name, success: 'false', ...options.tags },
              })
            }
            
            throw error
          })
      }
      
      // Handle sync functions
      if (options.trackPerformance) {
        trackMetric({
          name: `function_duration`,
          value: Date.now() - startTime,
          unit: 'ms',
          tags: { function_name: name, success: 'true', ...options.tags },
        })
      }
      
      return result
    } catch (error) {
      trackError(error as Error, {
        severity: options.severity || 'medium',
        tags: { function_name: name, ...options.tags },
      })
      
      if (options.trackPerformance) {
        trackMetric({
          name: `function_duration`,
          value: Date.now() - startTime,
          unit: 'ms',
          tags: { function_name: name, success: 'false', ...options.tags },
        })
      }
      
      throw error
    }
  }) as T
}

export default ErrorTracker