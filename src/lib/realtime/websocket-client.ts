import { WebSocketMessage, BehaviorEvent, FormAdaptation } from '@/types'
import { createAdaptError, debounce } from '@/utils'

export interface WebSocketClientConfig {
  url: string
  sessionId: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  debugging?: boolean
}

export interface WebSocketEventHandlers {
  onAdaptation?: (adaptation: FormAdaptation) => void
  onProfileUpdate?: (profile: any) => void
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onReconnect?: (attempt: number) => void
}

/**
 * WebSocket client for real-time communication with Adapt backend
 */
export class AdaptWebSocketClient {
  private ws: WebSocket | null = null
  private config: WebSocketClientConfig
  private handlers: WebSocketEventHandlers
  private isConnected = false
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private messageQueue: WebSocketMessage[] = []

  constructor(config: WebSocketClientConfig, handlers: WebSocketEventHandlers = {}) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      debugging: false,
      ...config,
    }
    this.handlers = handlers
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws && this.isConnected) {
      return
    }

    try {
      const wsUrl = this.config.url.replace(/^http/, 'ws')
      this.ws = new WebSocket(`${wsUrl}?sessionId=${this.config.sessionId}`)

      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)

      if (this.config.debugging) {
        console.log('Attempting WebSocket connection to:', wsUrl)
      }

    } catch (error) {
      throw createAdaptError(
        'Failed to create WebSocket connection',
        'WEBSOCKET_CONNECTION_ERROR',
        { error, url: this.config.url }
      )
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.cleanup()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
    }
  }

  /**
   * Send a message to the server
   */
  send(message: WebSocketMessage): void {
    if (!this.isConnected || !this.ws) {
      // Queue message for when connection is established
      this.messageQueue.push(message)
      return
    }

    try {
      this.ws.send(JSON.stringify(message))
      
      if (this.config.debugging) {
        console.log('Sent WebSocket message:', message)
      }
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      // Re-queue message
      this.messageQueue.push(message)
    }
  }

  /**
   * Send behavior event
   */
  sendBehaviorEvent(event: BehaviorEvent): void {
    this.send({
      type: 'behavior_event',
      payload: event,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
    })
  }

  /**
   * Send ping message
   */
  ping(): void {
    this.send({
      type: 'ping',
      payload: { timestamp: Date.now() },
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
    })
  }

  /**
   * Get connection status
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    this.isConnected = true
    this.reconnectAttempts = 0

    if (this.config.debugging) {
      console.log('WebSocket connected')
    }

    // Send queued messages
    this.flushMessageQueue()

    // Start heartbeat
    this.startHeartbeat()

    // Notify handler
    this.handlers.onConnect?.()
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)

      if (this.config.debugging) {
        console.log('Received WebSocket message:', message)
      }

      this.processMessage(message)

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error, event.data)
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.isConnected = false
    this.stopHeartbeat()

    if (this.config.debugging) {
      console.log('WebSocket closed:', event.code, event.reason)
    }

    // Notify handler
    this.handlers.onDisconnect?.()

    // Attempt reconnection if not intentional
    if (event.code !== 1000) { // 1000 = normal closure
      this.attemptReconnect()
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    const error = createAdaptError(
      'WebSocket error occurred',
      'WEBSOCKET_ERROR',
      { event }
    )

    console.error('WebSocket error:', error)
    this.handlers.onError?.(error)
  }

  /**
   * Process incoming WebSocket message
   */
  private processMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'adaptation':
        if (this.handlers.onAdaptation) {
          this.handlers.onAdaptation(message.payload as FormAdaptation)
        }
        break

      case 'behavior_event':
        // Handle behavior event feedback if needed
        break

      case 'pong':
        // Handle pong response
        if (this.config.debugging) {
          console.log('Received pong')
        }
        break

      case 'error':
        const error = createAdaptError(
          'Server error',
          'SERVER_ERROR',
          { payload: message.payload }
        )
        this.handlers.onError?.(error)
        break

      default:
        console.warn('Unknown message type:', message.type)
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.ping()
      }
    }, this.config.heartbeatInterval)
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++

    if (this.config.debugging) {
      console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`)
    }

    this.reconnectTimer = setTimeout(() => {
      this.handlers.onReconnect?.(this.reconnectAttempts)
      this.connect().catch(error => {
        console.error('Reconnection failed:', error)
        this.attemptReconnect()
      })
    }, this.config.reconnectInterval)
  }

  /**
   * Clean up timers and connections
   */
  private cleanup(): void {
    this.isConnected = false
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHeartbeat()
  }
}

/**
 * Real-time event processor for handling server-sent events
 */
export class RealtimeEventProcessor {
  private wsClient: AdaptWebSocketClient | null = null
  private eventHandlers: Map<string, Function[]> = new Map()
  private sessionId: string

  constructor(sessionId: string) {
    this.sessionId = sessionId
  }

  /**
   * Initialize real-time connection
   */
  async initialize(config: {
    apiUrl: string
    debugging?: boolean
  }): Promise<void> {
    const wsConfig: WebSocketClientConfig = {
      url: config.apiUrl,
      sessionId: this.sessionId,
      debugging: config.debugging,
    }

    const handlers: WebSocketEventHandlers = {
      onAdaptation: this.handleAdaptation.bind(this),
      onProfileUpdate: this.handleProfileUpdate.bind(this),
      onError: this.handleError.bind(this),
      onConnect: this.handleConnect.bind(this),
      onDisconnect: this.handleDisconnect.bind(this),
      onReconnect: this.handleReconnect.bind(this),
    }

    this.wsClient = new AdaptWebSocketClient(wsConfig, handlers)
    await this.wsClient.connect()
  }

  /**
   * Add event listener
   */
  on(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    this.eventHandlers.get(eventType)!.push(handler)
  }

  /**
   * Remove event listener
   */
  off(eventType: string, handler: Function): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Send behavior event through WebSocket
   */
  sendBehaviorEvent(event: BehaviorEvent): void {
    this.wsClient?.sendBehaviorEvent(event)
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.wsClient?.disconnect()
    this.wsClient = null
    this.eventHandlers.clear()
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.wsClient?.isConnectedToServer() ?? false
  }

  // Event handlers
  private handleAdaptation(adaptation: FormAdaptation): void {
    this.emit('adaptation', adaptation)
  }

  private handleProfileUpdate(profile: any): void {
    this.emit('profile_update', profile)
  }

  private handleError(error: Error): void {
    this.emit('error', error)
  }

  private handleConnect(): void {
    this.emit('connect')
  }

  private handleDisconnect(): void {
    this.emit('disconnect')
  }

  private handleReconnect(attempt: number): void {
    this.emit('reconnect', attempt)
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(eventType: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args)
        } catch (error) {
          console.error(`Error in ${eventType} handler:`, error)
        }
      })
    }
  }
}

export default AdaptWebSocketClient