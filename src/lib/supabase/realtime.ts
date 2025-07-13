import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase, createRealtimeChannel } from './client'
import { BehaviorEvent, FormAdaptation, UserProfile, Database } from '@/types'
import { createAdaptError } from '@/utils'

export interface RealtimeSubscriptionConfig {
  sessionId: string
  formId?: string
  debugging?: boolean
}

export interface RealtimeEventHandlers {
  onBehaviorEvent?: (event: BehaviorEvent) => void
  onAdaptation?: (adaptation: FormAdaptation) => void
  onProfileUpdate?: (profile: UserProfile) => void
  onError?: (error: Error) => void
}

/**
 * Supabase real-time subscription manager
 */
export class SupabaseRealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private config: RealtimeSubscriptionConfig
  private handlers: RealtimeEventHandlers
  private isConnected = false

  constructor(config: RealtimeSubscriptionConfig, handlers: RealtimeEventHandlers = {}) {
    this.config = config
    this.handlers = handlers
  }

  /**
   * Initialize real-time subscriptions
   */
  async initialize(): Promise<void> {
    try {
      // Create session-specific channel
      await this.createSessionChannel()
      
      // Create form-specific channel if formId is provided
      if (this.config.formId) {
        await this.createFormChannel()
      }
      
      // Create behavior events channel
      await this.createBehaviorEventsChannel()
      
      // Create adaptations channel
      await this.createAdaptationsChannel()
      
      // Create user profiles channel
      await this.createUserProfilesChannel()
      
      this.isConnected = true
      
      if (this.config.debugging) {
        console.log('Supabase realtime subscriptions initialized')
      }
      
    } catch (error) {
      throw createAdaptError(
        'Failed to initialize Supabase realtime subscriptions',
        'REALTIME_INIT_ERROR',
        { error }
      )
    }
  }

  /**
   * Create session-specific channel for targeted updates
   */
  private async createSessionChannel(): Promise<void> {
    const channelName = `session-${this.config.sessionId}`
    const channel = createRealtimeChannel(channelName)

    // Listen for session-specific adaptations
    channel
      .on('broadcast', { event: 'adaptation' }, (payload) => {
        if (this.config.debugging) {
          console.log('Received session adaptation:', payload)
        }
        this.handlers.onAdaptation?.(payload.payload as FormAdaptation)
      })
      .on('broadcast', { event: 'profile_update' }, (payload) => {
        if (this.config.debugging) {
          console.log('Received profile update:', payload)
        }
        this.handlers.onProfileUpdate?.(payload.payload as UserProfile)
      })

    const subscriptionResult = await channel.subscribe()
    
    if (subscriptionResult && subscriptionResult.toString() === 'SUBSCRIBED') {
      this.channels.set(channelName, channel)
      if (this.config.debugging) {
        console.log(`Subscribed to ${channelName}`)
      }
    } else {
      throw createAdaptError(
        `Failed to subscribe to ${channelName}`,
        'SUBSCRIPTION_ERROR'
      )
    }
  }

  /**
   * Create form-specific channel
   */
  private async createFormChannel(): Promise<void> {
    if (!this.config.formId) return

    const channelName = `form-${this.config.formId}`
    const channel = createRealtimeChannel(channelName)

    // Listen for form-specific events
    channel
      .on('broadcast', { event: 'form_adaptation' }, (payload) => {
        if (this.config.debugging) {
          console.log('Received form adaptation:', payload)
        }
        this.handlers.onAdaptation?.(payload.payload as FormAdaptation)
      })

    const subscriptionResult = await channel.subscribe()
    
    if (subscriptionResult && subscriptionResult.toString() === 'SUBSCRIBED') {
      this.channels.set(channelName, channel)
      if (this.config.debugging) {
        console.log(`Subscribed to ${channelName}`)
      }
    }
  }

  /**
   * Create behavior events channel for real-time event streaming
   */
  private async createBehaviorEventsChannel(): Promise<void> {
    const channelName = 'behavior-events'
    const channel = createRealtimeChannel(channelName)

    // Listen for behavior event insertions
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'behavior_events',
          filter: `session_id=eq.${this.config.sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['behavior_events']['Row']>) => {
          if (this.config.debugging) {
            console.log('Received behavior event:', payload)
          }
          
          if (payload.new) {
            this.handlers.onBehaviorEvent?.(payload.new as BehaviorEvent)
          }
        }
      )

    const subscriptionResult = await channel.subscribe()
    
    if (subscriptionResult && subscriptionResult.toString() === 'SUBSCRIBED') {
      this.channels.set(channelName, channel)
      if (this.config.debugging) {
        console.log(`Subscribed to ${channelName}`)
      }
    }
  }

  /**
   * Create adaptations channel for real-time adaptation updates
   */
  private async createAdaptationsChannel(): Promise<void> {
    const channelName = 'adaptations'
    const channel = createRealtimeChannel(channelName)

    // Listen for adaptation insertions
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'adaptations',
          filter: `session_id=eq.${this.config.sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['adaptations']['Row']>) => {
          if (this.config.debugging) {
            console.log('Received adaptation:', payload)
          }
          
          if (payload.new) {
            this.handlers.onAdaptation?.(payload.new as FormAdaptation)
          }
        }
      )

    const subscriptionResult = await channel.subscribe()
    
    if (subscriptionResult && subscriptionResult.toString() === 'SUBSCRIBED') {
      this.channels.set(channelName, channel)
      if (this.config.debugging) {
        console.log(`Subscribed to ${channelName}`)
      }
    }
  }

  /**
   * Create user profiles channel for profile updates
   */
  private async createUserProfilesChannel(): Promise<void> {
    const channelName = 'user-profiles'
    const channel = createRealtimeChannel(channelName)

    // Listen for profile insertions and updates
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `session_id=eq.${this.config.sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['user_profiles']['Row']>) => {
          if (this.config.debugging) {
            console.log('Received profile update:', payload)
          }
          
          if (payload.new) {
            this.handlers.onProfileUpdate?.(payload.new as UserProfile)
          }
        }
      )

    const subscriptionResult = await channel.subscribe()
    
    if (subscriptionResult && subscriptionResult.toString() === 'SUBSCRIBED') {
      this.channels.set(channelName, channel)
      if (this.config.debugging) {
        console.log(`Subscribed to ${channelName}`)
      }
    }
  }

  /**
   * Send a broadcast message to session channel
   */
  async sendSessionBroadcast(event: string, payload: any): Promise<void> {
    const channelName = `session-${this.config.sessionId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event,
        payload,
      })
      
      if (this.config.debugging) {
        console.log(`Sent broadcast to ${channelName}:`, { event, payload })
      }
    }
  }

  /**
   * Send a broadcast message to form channel
   */
  async sendFormBroadcast(event: string, payload: any): Promise<void> {
    if (!this.config.formId) return

    const channelName = `form-${this.config.formId}`
    const channel = this.channels.get(channelName)
    
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event,
        payload,
      })
      
      if (this.config.debugging) {
        console.log(`Sent broadcast to ${channelName}:`, { event, payload })
      }
    }
  }

  /**
   * Check if real-time is connected
   */
  isRealtimeConnected(): boolean {
    return this.isConnected && this.channels.size > 0
  }

  /**
   * Get active channel count
   */
  getActiveChannelCount(): number {
    return this.channels.size
  }

  /**
   * Disconnect and cleanup all channels
   */
  async disconnect(): Promise<void> {
    const disconnectPromises = Array.from(this.channels.values()).map(channel => 
      supabase.removeChannel(channel)
    )
    
    await Promise.all(disconnectPromises)
    
    this.channels.clear()
    this.isConnected = false
    
    if (this.config.debugging) {
      console.log('Supabase realtime subscriptions disconnected')
    }
  }
}

/**
 * Real-time analytics subscriber for monitoring form performance
 */
export class RealtimeAnalyticsSubscriber {
  private channel: RealtimeChannel | null = null
  private formId: string
  private onUpdate: (analytics: any) => void

  constructor(formId: string, onUpdate: (analytics: any) => void) {
    this.formId = formId
    this.onUpdate = onUpdate
  }

  /**
   * Start subscribing to analytics updates
   */
  async start(): Promise<void> {
    this.channel = createRealtimeChannel(`analytics-${this.formId}`)

    this.channel
      .on('broadcast', { event: 'analytics_update' }, (payload) => {
        this.onUpdate(payload.payload)
      })

    await this.channel.subscribe()
  }

  /**
   * Stop subscribing to analytics updates
   */
  async stop(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel)
      this.channel = null
    }
  }
}

/**
 * Utility function to create a real-time subscription
 */
export async function createRealtimeSubscription(
  config: RealtimeSubscriptionConfig,
  handlers: RealtimeEventHandlers
): Promise<SupabaseRealtimeManager> {
  const manager = new SupabaseRealtimeManager(config, handlers)
  await manager.initialize()
  return manager
}

/**
 * Utility function to get active sessions in real-time
 */
export async function subscribeToActiveSessions(
  onUpdate: (sessions: any[]) => void
): Promise<RealtimeChannel> {
  const channel = createRealtimeChannel('active-sessions')

  channel
    .on('broadcast', { event: 'sessions_update' }, (payload) => {
      onUpdate(payload.payload)
    })

  await channel.subscribe()
  return channel
}

export default SupabaseRealtimeManager