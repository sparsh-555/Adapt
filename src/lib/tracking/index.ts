export { default as AdaptClient } from './adapt-client'
export { AdaptClientImpl } from './adapt-client'

// Export types for external use
export type {
  BehaviorEvent,
  FormAdaptation,
  AdaptConfig,
  TrackingOptions,
  AdaptationOptions,
  AdaptClient as IAdaptClient,
} from '@/types'

// Utility functions for client-side usage
export {
  generateSessionId,
  debounce,
  throttle,
  findFormElements,
  getFormFields,
  getFieldInfo,
  parseUserAgent,
} from '@/utils'

// Create a singleton instance for global usage
import AdaptClientImpl from './adapt-client'

let globalInstance: AdaptClientImpl | null = null

/**
 * Get or create the global Adapt client instance
 */
export function getAdaptClient(): AdaptClientImpl {
  if (!globalInstance) {
    globalInstance = new AdaptClientImpl()
  }
  return globalInstance
}

/**
 * Initialize Adapt with a simple API
 */
export async function initAdapt(config: {
  apiUrl: string
  formSelector?: string
  trackMouse?: boolean
  trackKeyboard?: boolean
  trackScroll?: boolean
  debug?: boolean
}): Promise<AdaptClientImpl> {
  const client = getAdaptClient()
  
  await client.init({
    apiUrl: config.apiUrl,
    formSelector: config.formSelector || 'form',
    trackingOptions: {
      trackMouse: config.trackMouse ?? true,
      trackKeyboard: config.trackKeyboard ?? true,
      trackScroll: config.trackScroll ?? true,
      debounceMs: 100,
      batchSize: 10,
      enableProfiling: false,
    },
    adaptationOptions: {
      enableFieldReordering: true,
      enableProgressiveDisclosure: true,
      enableContextSwitching: true,
      enableErrorPrevention: true,
      confidenceThreshold: 0.3,
      maxAdaptationsPerSession: 10,
    },
    debugging: config.debug ?? false,
  })
  
  return client
}

/**
 * Destroy the global Adapt client instance
 */
export async function destroyAdapt(): Promise<void> {
  if (globalInstance) {
    await globalInstance.destroy()
    globalInstance = null
  }
}