import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 100,
    },
  },
})

export type Database = {
  public: {
    Tables: {
      behavior_events: {
        Row: {
          id: string
          session_id: string
          form_id: string
          event_type: string
          field_name: string | null
          timestamp: string
          data: any
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          form_id: string
          event_type: string
          field_name?: string | null
          timestamp?: string
          data?: any
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          form_id?: string
          event_type?: string
          field_name?: string | null
          timestamp?: string
          data?: any
          user_agent?: string | null
          created_at?: string
        }
      }
      adaptations: {
        Row: {
          id: string
          session_id: string
          form_id: string
          adaptation_type: string
          config: any
          applied_at: string
          performance_impact: any | null
        }
        Insert: {
          id?: string
          session_id: string
          form_id: string
          adaptation_type: string
          config: any
          applied_at?: string
          performance_impact?: any | null
        }
        Update: {
          id?: string
          session_id?: string
          form_id?: string
          adaptation_type?: string
          config?: any
          applied_at?: string
          performance_impact?: any | null
        }
      }
      user_profiles: {
        Row: {
          id: string
          session_id: string
          behavior_type: string | null
          confidence_score: number | null
          characteristics: any | null
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          behavior_type?: string | null
          confidence_score?: number | null
          characteristics?: any | null
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          behavior_type?: string | null
          confidence_score?: number | null
          characteristics?: any | null
          updated_at?: string
        }
      }
      form_metrics: {
        Row: {
          id: number
          form_id: string
          date: string
          total_sessions: number | null
          completed_sessions: number | null
          avg_completion_time: string | null
          adaptations_applied: number | null
          conversion_improvement: number | null
          created_at: string
        }
        Insert: {
          id?: number
          form_id: string
          date: string
          total_sessions?: number | null
          completed_sessions?: number | null
          avg_completion_time?: string | null
          adaptations_applied?: number | null
          conversion_improvement?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          form_id?: string
          date?: string
          total_sessions?: number | null
          completed_sessions?: number | null
          avg_completion_time?: string | null
          adaptations_applied?: number | null
          conversion_improvement?: number | null
          created_at?: string
        }
      }
    }
  }
}