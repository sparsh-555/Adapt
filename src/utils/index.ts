import { v4 as uuidv4 } from 'uuid'
import { BehaviorEvent, UserProfile, AdaptError } from '@/types'

// ID generation utilities
export const generateSessionId = (): string => uuidv4()
export const generateEventId = (): string => uuidv4()
export const generateId = (): string => uuidv4() // Generic ID generator
export const generateFormId = (element: HTMLFormElement): string => {
  return element.id || element.dataset.formId || `form-${Date.now()}`
}

// Time utilities
export const getCurrentTimestamp = (): number => Date.now()
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toISOString()
}

// Debouncing utility
export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Throttling utility
export const throttle = <T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// Event validation
export const validateBehaviorEvent = (event: Partial<BehaviorEvent>): boolean => {
  return !!(
    event.sessionId &&
    event.formId &&
    event.eventType &&
    event.timestamp &&
    event.userAgent
  )
}

// User agent parsing
export const parseUserAgent = (userAgent: string) => {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
  const isTablet = /iPad|Tablet/.test(userAgent)
  const isDesktop = !isMobile && !isTablet
  
  const browser = (() => {
    if (userAgent.includes('Chrome')) return 'chrome'
    if (userAgent.includes('Firefox')) return 'firefox'
    if (userAgent.includes('Safari')) return 'safari'
    if (userAgent.includes('Edge')) return 'edge'
    return 'unknown'
  })()
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    browser,
    deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  }
}

// Form utilities
export const findFormElements = (
  container: HTMLElement = document.body
): HTMLFormElement[] => {
  return Array.from(container.querySelectorAll('form'))
}

export const getFormFields = (form: HTMLFormElement): HTMLElement[] => {
  const selectors = [
    'input:not([type="hidden"])',
    'textarea',
    'select',
    '[contenteditable="true"]',
  ]
  
  return Array.from(form.querySelectorAll(selectors.join(', ')))
}

export const getFieldInfo = (field: HTMLElement) => {
  const tagName = field.tagName.toLowerCase()
  const type = (field as HTMLInputElement).type || 'text'
  const name = (field as HTMLInputElement).name || field.id || ''
  const required = (field as HTMLInputElement).required || false
  
  return {
    tagName,
    type,
    name,
    required,
    isInput: tagName === 'input',
    isTextarea: tagName === 'textarea',
    isSelect: tagName === 'select',
    isContentEditable: field.contentEditable === 'true',
  }
}

// Behavioral analysis utilities
export const calculateTypingSpeed = (
  keyEvents: Array<{ timestamp: number; key: string }>
): number => {
  if (keyEvents.length < 2) return 0
  
  const totalTime = keyEvents[keyEvents.length - 1].timestamp - keyEvents[0].timestamp
  const charactersTyped = keyEvents.filter(e => e.key.length === 1).length
  
  return totalTime > 0 ? (charactersTyped / totalTime) * 60000 : 0 // WPM
}

export const detectCorrectionPattern = (
  inputEvents: Array<{ value: string; timestamp: number }>
): number => {
  let corrections = 0
  
  for (let i = 1; i < inputEvents.length; i++) {
    const current = inputEvents[i].value
    const previous = inputEvents[i - 1].value
    
    if (current.length < previous.length) {
      corrections++
    }
  }
  
  return corrections
}

export const classifyUserBehavior = (
  events: BehaviorEvent[],
  profile?: UserProfile
): string => {
  const mouseEvents = events.filter(e => e.eventType === 'mouse_move').length
  const keyEvents = events.filter(e => e.eventType === 'key_press').length
  const focusEvents = events.filter(e => e.eventType === 'focus').length
  
  // Simple heuristic-based classification
  if (mouseEvents > keyEvents * 2) {
    return 'methodical_user'
  } else if (keyEvents > mouseEvents && focusEvents < 5) {
    return 'fast_user'
  } else if (profile?.characteristics.deviceType === 'mobile') {
    return 'mobile_user'
  } else {
    return 'desktop_user'
  }
}

// Animation utilities
export const animateElement = (
  element: HTMLElement,
  properties: Record<string, string>,
  duration: number = 300
): Promise<void> => {
  return new Promise(resolve => {
    const originalTransition = element.style.transition
    element.style.transition = `all ${duration}ms ease-out`
    
    Object.entries(properties).forEach(([key, value]) => {
      element.style.setProperty(key, value)
    })
    
    setTimeout(() => {
      element.style.transition = originalTransition
      resolve()
    }, duration)
  })
}

// Error handling utilities
export const createAdaptError = (
  message: string,
  code: string,
  context?: Record<string, unknown>
): AdaptError => {
  return new AdaptError(message, code, context)
}

export const isAdaptError = (error: unknown): error is AdaptError => {
  return error instanceof AdaptError
}

// Environment detection
export const isSSR = (): boolean => {
  return typeof window === 'undefined'
}

export const isBrowser = (): boolean => {
  return typeof window !== 'undefined'
}

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production'
}

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development'
}

// Local storage utilities (with SSR safety)
export const getFromLocalStorage = (key: string): string | null => {
  if (isSSR()) return null
  
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.warn(`Failed to read from localStorage: ${key}`, error)
    return null
  }
}

export const setToLocalStorage = (key: string, value: string): boolean => {
  if (isSSR()) return false
  
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.warn(`Failed to write to localStorage: ${key}`, error)
    return false
  }
}

// Session storage utilities (with SSR safety)
export const getFromSessionStorage = (key: string): string | null => {
  if (isSSR()) return null
  
  try {
    return sessionStorage.getItem(key)
  } catch (error) {
    console.warn(`Failed to read from sessionStorage: ${key}`, error)
    return null
  }
}

export const setToSessionStorage = (key: string, value: string): boolean => {
  if (isSSR()) return false
  
  try {
    sessionStorage.setItem(key, value)
    return true
  } catch (error) {
    console.warn(`Failed to write to sessionStorage: ${key}`, error)
    return false
  }
}

// Data validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}

// Performance monitoring utilities
export const measurePerformance = async <T>(
  operation: () => Promise<T> | T,
  label: string
): Promise<{ result: T; duration: number }> => {
  const start = performance.now()
  const result = await operation()
  const duration = performance.now() - start
  
  if (isDevelopment()) {
    console.log(`${label}: ${duration.toFixed(2)}ms`)
  }
  
  return { result, duration }
}