export { 
  AdaptWebSocketClient, 
  RealtimeEventProcessor 
} from './websocket-client'

export type {
  WebSocketClientConfig,
  WebSocketEventHandlers,
} from './websocket-client'

// Re-export types for convenience
export type {
  WebSocketMessage,
  BehaviorEvent,
  FormAdaptation,
} from '@/types'

// Utility function to create a real-time connection
export async function createRealtimeConnection(config: {
  apiUrl: string
  sessionId: string
  debugging?: boolean
}): Promise<RealtimeEventProcessor> {
  const processor = new RealtimeEventProcessor(config.sessionId)
  await processor.initialize({
    apiUrl: config.apiUrl,
    debugging: config.debugging,
  })
  return processor
}