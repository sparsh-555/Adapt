import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { 
  BehaviorEvent, 
  FormAdaptation, 
  UserProfile, 
  TrackingAPIResponse,
  AdaptError 
} from '@/types'
import { 
  validateBehaviorEvent, 
  generateEventId, 
  classifyUserBehavior,
  createAdaptError 
} from '@/utils'
import { getQuickInsights } from '@/lib/ml'

// Configure the Edge Runtime
export const runtime = 'edge'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Main tracking endpoint
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    const events: Partial<BehaviorEvent>[] = Array.isArray(body.events) 
      ? body.events 
      : [body]

    // Validate events
    const validatedEvents: BehaviorEvent[] = []
    for (const event of events) {
      if (!validateBehaviorEvent(event)) {
        throw createAdaptError(
          'Invalid behavior event format',
          'INVALID_EVENT',
          { event }
        )
      }
      
      validatedEvents.push({
        ...event,
        id: generateEventId(),
        timestamp: event.timestamp || Date.now(),
        userAgent: event.userAgent || request.headers.get('user-agent') || '',
        url: event.url || request.headers.get('referer') || '',
      } as BehaviorEvent)
    }

    // Initialize Supabase client
    const supabase = createServerClient()

    // Process events and generate adaptations
    const response = await processEvents(supabase, validatedEvents)

    return NextResponse.json(response, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })

  } catch (error) {
    console.error('Error in tracking API:', error)
    
    const adaptError = error instanceof AdaptError 
      ? error 
      : createAdaptError('Internal server error', 'INTERNAL_ERROR')

    return NextResponse.json(
      {
        success: false,
        error: adaptError.message,
        code: adaptError.code,
        timestamp: Date.now(),
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

// Process behavior events and generate adaptations
async function processEvents(
  supabase: any,
  events: BehaviorEvent[]
): Promise<TrackingAPIResponse> {
  const sessionId = events[0]?.sessionId
  
  if (!sessionId) {
    throw createAdaptError('Session ID is required', 'MISSING_SESSION_ID')
  }

  // Store behavior events in batch (convert camelCase to snake_case for database)
  const { error: insertError } = await supabase
    .from('behavior_events')
    .insert(events.map(event => ({
      session_id: event.sessionId,
      form_id: event.formId,
      event_type: event.eventType,
      field_name: event.fieldName || null,
      timestamp: event.timestamp,
      data: event.data || {},
      user_agent: event.userAgent,
      url: event.url,
    })))

  if (insertError) {
    throw createAdaptError(
      'Failed to store behavior events',
      'STORAGE_ERROR',
      { error: insertError }
    )
  }

  // Get or create user profile
  let userProfile = await getUserProfile(supabase, sessionId)
  
  // Update user profile based on new events
  userProfile = await updateUserProfile(supabase, sessionId, events, userProfile)

  // Generate adaptations based on behavior
  const adaptations = await generateAdaptations(
    supabase, 
    sessionId, 
    events, 
    userProfile
  )

  return {
    success: true,
    data: {
      eventsProcessed: events.length,
      sessionId,
    },
    adaptations,
    userProfile,
    timestamp: Date.now(),
  }
}

// Get existing user profile or create a new one
async function getUserProfile(
  supabase: any, 
  sessionId: string
): Promise<UserProfile | undefined> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw createAdaptError(
      'Failed to fetch user profile',
      'PROFILE_FETCH_ERROR',
      { error }
    )
  }

  return data || undefined
}

// Update user profile based on behavior analysis
async function updateUserProfile(
  supabase: any,
  sessionId: string,
  _events: BehaviorEvent[],
  existingProfile?: UserProfile
): Promise<UserProfile> {
  // Get all events for this session for comprehensive analysis
  const { data: allEvents, error } = await supabase
    .from('behavior_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true })

  if (error) {
    throw createAdaptError(
      'Failed to fetch session events',
      'EVENTS_FETCH_ERROR',
      { error }
    )
  }

  // Analyze behavior and classify user
  const behaviorType = classifyUserBehavior(allEvents, existingProfile)
  
  // Calculate behavior characteristics
  const characteristics = analyzeBehaviorCharacteristics(allEvents)
  
  // Calculate confidence score based on number of events and consistency
  const confidenceScore = calculateConfidenceScore(allEvents, behaviorType)

  const profileData = {
    session_id: sessionId,
    behavior_type: behaviorType,
    confidence_score: confidenceScore,
    characteristics,
    updated_at: Date.now(),
  }

  // Upsert user profile
  const { data: profile, error: upsertError } = await supabase
    .from('user_profiles')
    .upsert(profileData, { 
      onConflict: 'session_id',
      ignoreDuplicates: false 
    })
    .select()
    .single()

  if (upsertError) {
    throw createAdaptError(
      'Failed to update user profile',
      'PROFILE_UPDATE_ERROR',
      { error: upsertError }
    )
  }

  return profile
}

// Analyze detailed behavior characteristics
function analyzeBehaviorCharacteristics(events: BehaviorEvent[]) {
  const focusEvents = events.filter(e => e.eventType === 'focus')
  const keyEvents = events.filter(e => e.eventType === 'key_press')
  
  // Calculate average field focus time
  const averageFieldFocusTime = focusEvents.length > 0 
    ? focusEvents.reduce((sum, event) => {
        const focusData = event.data as any
        return sum + (focusData?.focusTime || 0)
      }, 0) / focusEvents.length
    : 0

  // Estimate typing speed
  const typingSpeed = keyEvents.length > 1
    ? (keyEvents.length / (
        ((keyEvents[keyEvents.length - 1]?.timestamp || 0) - (keyEvents[0]?.timestamp || 0)) / 60000
      )) || 0
    : 0

  // Calculate correction frequency
  const fieldChangeEvents = events.filter(e => e.eventType === 'field_change')
  const correctionFrequency = fieldChangeEvents.reduce((count, event) => {
    const changeData = event.data as any
    return count + (changeData?.corrections || 0)
  }, 0)

  // Determine device type from user agent
  const userAgent = events[0]?.userAgent || ''
  const deviceType = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 'desktop'

  // Analyze navigation style
  const navigationStyle = analyzeNavigationStyle(events)

  return {
    averageFieldFocusTime,
    typingSpeed,
    correctionFrequency,
    scrollPatterns: [], // TODO: Implement scroll pattern analysis
    deviceType,
    navigationStyle,
    errorPatterns: [], // TODO: Implement error pattern analysis
    completionRate: 0, // TODO: Calculate based on form submissions
  }
}

// Analyze how user navigates through forms
function analyzeNavigationStyle(events: BehaviorEvent[]): 'linear' | 'jumping' | 'searching' {
  const focusEvents = events.filter(e => e.eventType === 'focus')
  
  if (focusEvents.length < 3) return 'linear'
  
  let jumps = 0
  let searches = 0
  
  for (let i = 1; i < focusEvents.length; i++) {
    const current = focusEvents[i]?.fieldName
    const previous = focusEvents[i - 1]?.fieldName
    
    // Simple heuristic: if field names suggest skipping or going backwards
    if (current && previous && current !== previous) {
      if (current < previous) {
        searches++
      } else {
        jumps++
      }
    }
  }
  
  if (searches > jumps) return 'searching'
  if (jumps > focusEvents.length * 0.3) return 'jumping'
  return 'linear'
}

// Calculate confidence score for behavioral classification
function calculateConfidenceScore(events: BehaviorEvent[], _behaviorType: string): number {
  const eventCount = events.length
  const sessionDuration = events.length > 1 
    ? (events[events.length - 1]?.timestamp || 0) - (events[0]?.timestamp || 0)
    : 0

  // Base confidence on number of events and session duration
  let confidence = Math.min(eventCount / 50, 1) * 0.6 // 60% weight for event count
  confidence += Math.min(sessionDuration / 300000, 1) * 0.4 // 40% weight for duration (5 min max)
  
  return Math.round(confidence * 100) / 100 // Round to 2 decimal places
}

// Generate form adaptations using separate ML inference API
async function generateAdaptations(
  supabase: any,
  sessionId: string,
  events: BehaviorEvent[],
  userProfile: UserProfile
): Promise<FormAdaptation[]> {
  try {
    // Get quick insights for immediate decision making
    const quickInsights = getQuickInsights(events)
    
    // Only generate adaptations if we have sufficient data
    if (events.length < 3) {
      return []
    }

    const formIds = [...new Set(events.map(e => e.formId))]
    const allAdaptations: FormAdaptation[] = []
    
    for (const formId of formIds) {
      const formEvents = events.filter(e => e.formId === formId)
      
      try {
        // Create form context for ML inference
        const formContext = {
          formId,
          deviceType: determineDeviceType(events[0]?.userAgent || ''),
          formElements: await getFormElementsInfo(supabase, formId),
          currentAdaptations: await getCurrentAdaptations(supabase, sessionId, formId),
          sessionStartTime: events[0]?.timestamp || Date.now(),
        }

        // Call separate ML inference API (Node.js runtime)
        const mlResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/ml-inference`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            events: formEvents,
            userProfile,
            formContext,
          }),
        })

        if (mlResponse.ok) {
          const mlResult = await mlResponse.json()
          
          if (mlResult.success && mlResult.data.adaptations) {
            allAdaptations.push(...mlResult.data.adaptations)
            
            if (process.env.NODE_ENV === 'development') {
              console.log('ML Inference successful:', {
                sessionId,
                formId,
                adaptationCount: mlResult.data.adaptations.length,
                mlUsed: mlResult.data.mlUsed,
              })
            }
          } else {
            throw new Error('ML inference returned no adaptations')
          }
        } else {
          throw new Error(`ML inference API failed: ${mlResponse.status}`)
        }

      } catch (mlError) {
        if (process.env.NODE_ENV === 'development') {
          console.log('ML processing failed, falling back to rule-based:', mlError)
        }
        
        // Fallback to simple rule-based adaptations
        const fallbackAdaptations = await generateFallbackAdaptations(
          sessionId,
          formId,
          formEvents,
          userProfile,
          quickInsights
        )
        
        allAdaptations.push(...fallbackAdaptations)
      }
    }

    // Store adaptations in database (convert camelCase to snake_case)
    if (allAdaptations.length > 0) {
      const { error } = await supabase
        .from('adaptations')
        .insert(allAdaptations.map(adaptation => ({
          id: adaptation.id,
          session_id: adaptation.sessionId,
          form_id: adaptation.formId,
          adaptation_type: adaptation.adaptationType,
          confidence: adaptation.confidence,
          config: adaptation.parameters || adaptation.config || {},
          applied_at: typeof adaptation.appliedAt === 'string' 
            ? new Date(adaptation.appliedAt).toISOString()
            : new Date(adaptation.appliedAt).toISOString(),
          is_active: adaptation.isActive ?? true,
          description: adaptation.description,
          metadata: adaptation.metadata || {},
        })))

      if (error) {
        console.error('Failed to store adaptations:', error)
        // Don't throw error here, just log it
      }
    }

    return allAdaptations

  } catch (error) {
    console.error('Adaptation generation failed:', error)
    return []
  }
}

// Helper function to determine device type from user agent
function determineDeviceType(userAgent: string): string {
  if (/mobile|android|iphone/i.test(userAgent)) return 'mobile'
  if (/tablet|ipad/i.test(userAgent)) return 'tablet'
  return 'desktop'
}

// Helper function to get form elements information
async function getFormElementsInfo(_supabase: any, _formId: string) {
  // In a real implementation, this would query form metadata
  // For now, return default structure
  return {
    totalFields: 5,
    fieldTypes: ['text', 'email', 'tel', 'textarea', 'select'],
    hasValidation: true,
    layout: 'single-column' as const,
  }
}

// Helper function to get current adaptations for a session/form
async function getCurrentAdaptations(
  supabase: any, 
  sessionId: string, 
  formId: string
): Promise<FormAdaptation[]> {
  const { data, error } = await supabase
    .from('adaptations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('form_id', formId)
    .eq('is_active', true)

  if (error) {
    console.error('Failed to fetch current adaptations:', error)
    return []
  }

  return data || []
}

// Fallback adaptation generation when ML fails
async function generateFallbackAdaptations(
  sessionId: string,
  formId: string,
  events: BehaviorEvent[],
  _userProfile: UserProfile,
  quickInsights: ReturnType<typeof getQuickInsights>
): Promise<FormAdaptation[]> {
  const adaptations: FormAdaptation[] = []
  const timestamp = new Date().toISOString()

  // Generate simple adaptations based on quick insights
  switch (quickInsights.userType) {
    case 'fast':
      adaptations.push({
        id: generateEventId(),
        sessionId,
        formId,
        adaptationType: 'progressive_disclosure',
        confidence: 0.6,
        parameters: {
          initialFields: 3,
          strategy: 'efficiency',
        },
        config: {
          progressiveDisclosure: {
            fieldsToReveal: [],
            triggerConditions: ['field_completion'],
            initialFields: 3,
            strategy: 'efficiency',
          }
        },
        cssChanges: {},
        jsChanges: '',
        appliedAt: timestamp,
        isActive: true,
        description: 'Progressive disclosure for fast users',
        metadata: {
          source: 'fallback',
          userType: quickInsights.userType,
        },
      })
      break

    case 'struggling':
      adaptations.push({
        id: generateEventId(),
        sessionId,
        formId,
        adaptationType: 'error_prevention',
        confidence: 0.7,
        parameters: {
          enableRealTimeValidation: true,
          enableInlineHelp: true,
        },
        config: {
          errorPrevention: {
            fieldName: '',
            validationRules: [],
            helpText: 'Need help with this field?',
            enableRealTimeValidation: true,
            enableInlineHelp: true,
          }
        },
        cssChanges: {},
        jsChanges: '',
        appliedAt: timestamp,
        isActive: true,
        description: 'Error prevention for struggling users',
        metadata: {
          source: 'fallback',
          userType: quickInsights.userType,
        },
      })
      break

    case 'careful':
      adaptations.push({
        id: generateEventId(),
        sessionId,
        formId,
        adaptationType: 'completion_guidance',
        confidence: 0.5,
        parameters: {
          showProgress: true,
          confirmationMessages: true,
        },
        config: {
          completionGuidance: {
            showProgress: true,
            confirmationMessages: true,
          }
        },
        cssChanges: {},
        jsChanges: '',
        appliedAt: timestamp,
        isActive: true,
        description: 'Completion guidance for careful users',
        metadata: {
          source: 'fallback',
          userType: quickInsights.userType,
        },
      })
      break
  }

  // Add device-specific adaptations
  const deviceType = determineDeviceType(events[0]?.userAgent || '')
  if (deviceType === 'mobile') {
    adaptations.push({
      id: generateEventId(),
      sessionId,
      formId,
      adaptationType: 'context_switching',
      confidence: 0.8,
      parameters: {
        mobileOptimized: true,
        reducedFields: true,
      },
      config: {
        contextSwitching: {
          showFields: [],
          hideFields: [],
          conditions: { deviceType: 'mobile' },
          mobileOptimized: true,
          reducedFields: true,
        }
      },
      cssChanges: {},
      jsChanges: '',
      appliedAt: timestamp,
      isActive: true,
      description: 'Mobile optimization',
      metadata: {
        source: 'fallback',
        deviceType,
      },
    })
  }

  return adaptations
}