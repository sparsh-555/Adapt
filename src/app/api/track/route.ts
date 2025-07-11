import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { BehaviorEvent, UserProfile } from '@/lib/types'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const event: BehaviorEvent = await request.json()
    
    // Validate event data
    if (!event.sessionId || !event.formId || !event.eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Store behavior event
    const { error: eventError } = await supabase
      .from('behavior_events')
      .insert({
        session_id: event.sessionId,
        form_id: event.formId,
        event_type: event.eventType,
        field_name: event.fieldName,
        timestamp: new Date(event.timestamp).toISOString(),
        data: event.data,
        user_agent: event.userAgent || request.headers.get('user-agent')
      })

    if (eventError) {
      console.error('Failed to store behavior event:', eventError)
      return NextResponse.json(
        { error: 'Failed to store event' },
        { status: 500 }
      )
    }

    // Analyze user behavior and generate adaptations
    const adaptations: any[] = await generateAdaptations(event)

    // Update user profile if significant change
    await updateUserProfile(event.sessionId, event.formId, adaptations)

    return NextResponse.json({
      success: true,
      adaptations,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Error processing behavior event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateAdaptations(event: BehaviorEvent): Promise<any[]> {
  const adaptations: any[] = []

  // Get recent behavior events for this session
  const { data: recentEvents } = await supabase
    .from('behavior_events')
    .select('*')
    .eq('session_id', event.sessionId)
    .order('timestamp', { ascending: false })
    .limit(50)

  if (!recentEvents) return adaptations

  // Analyze behavior patterns
  const behaviorAnalysis = analyzeBehaviorPatterns(recentEvents)

  // Generate specific adaptations based on analysis
  if (behaviorAnalysis.showsHesitation) {
    adaptations.push({
      id: `help_${event.sessionId}_${Date.now()}`,
      type: 'contextual_help',
      target: event.fieldName || 'form',
      config: {
        fieldName: event.fieldName,
        helpText: 'Need help with this field? Click here for guidance.',
        trigger: 'focus',
        position: 'bottom'
      },
      confidence: behaviorAnalysis.confidence
    })
  }

  if (behaviorAnalysis.isErrorProne) {
    adaptations.push({
      id: `validation_${event.sessionId}_${Date.now()}`,
      type: 'smart_validation',
      target: event.fieldName || 'form',
      config: {
        fieldName: event.fieldName,
        validationType: 'real_time',
        message: 'Please check your input format',
        timing: 'immediate'
      },
      confidence: behaviorAnalysis.confidence
    })
  }

  if (behaviorAnalysis.isSpeedRunner) {
    adaptations.push({
      id: `progressive_${event.sessionId}_${Date.now()}`,
      type: 'progressive_disclosure',
      target: 'form',
      config: {
        fieldsToHide: ['optional_phone', 'company_size', 'referral_source'],
        triggerCondition: {
          triggerField: 'email',
          triggerValue: { pattern: '.+@.+' },
          triggerEvent: 'input'
        }
      },
      confidence: behaviorAnalysis.confidence
    })
  }

  if (behaviorAnalysis.needsFieldReordering) {
    adaptations.push({
      id: `reorder_${event.sessionId}_${Date.now()}`,
      type: 'field_reorder',
      target: 'form',
      config: {
        newOrder: behaviorAnalysis.optimizedFieldOrder
      },
      confidence: behaviorAnalysis.confidence
    })
  }

  return adaptations
}

function analyzeBehaviorPatterns(events: any[]) {
  const analysis = {
    showsHesitation: false,
    isErrorProne: false,
    isSpeedRunner: false,
    needsFieldReordering: false,
    optimizedFieldOrder: [] as string[],
    confidence: 0
  }

  if (events.length === 0) return analysis

  // Calculate confidence based on data volume
  analysis.confidence = Math.min(events.length / 20, 1.0)

  // Analyze hesitation patterns
  const hoverEvents = events.filter(e => e.event_type === 'field_hover_start')
  const focusEvents = events.filter(e => e.event_type === 'field_focus')
  
  if (hoverEvents.length > focusEvents.length * 2) {
    analysis.showsHesitation = true
  }

  // Analyze error patterns
  const inputEvents = events.filter(e => e.event_type === 'field_input')
  const correctionEvents = events.filter(e => 
    e.event_type === 'field_input' && 
    e.data?.corrections && 
    e.data.corrections > 0
  )

  if (correctionEvents.length > inputEvents.length * 0.3) {
    analysis.isErrorProne = true
  }

  // Analyze speed patterns
  const completionTimes = events
    .filter(e => e.event_type === 'field_blur')
    .map(e => e.data?.completionTime)
    .filter(time => time && time > 0)

  if (completionTimes.length > 0) {
    const avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
    if (avgCompletionTime < 2000) { // Less than 2 seconds per field
      analysis.isSpeedRunner = true
    }
  }

  // Analyze field interaction patterns for reordering
  const fieldInteractionCounts = new Map()
  events.forEach(event => {
    if (event.field_name) {
      fieldInteractionCounts.set(
        event.field_name,
        (fieldInteractionCounts.get(event.field_name) || 0) + 1
      )
    }
  })

  // Sort fields by interaction frequency
  const sortedFields = Array.from(fieldInteractionCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([fieldName]) => fieldName)

  if (sortedFields.length > 3) {
    analysis.needsFieldReordering = true
    analysis.optimizedFieldOrder = sortedFields
  }

  return analysis
}

async function updateUserProfile(sessionId: string, formId: string, adaptations: any[]) {
  // Get current profile
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  // Calculate new characteristics based on adaptations
  const characteristics = {
    needsHelp: adaptations.some(a => a.type === 'contextual_help'),
    errorProne: adaptations.some(a => a.type === 'smart_validation'),
    speedRunner: adaptations.some(a => a.type === 'progressive_disclosure'),
    needsReordering: adaptations.some(a => a.type === 'field_reorder')
  }

  // Determine behavior type
  let behaviorType = 'average'
  if (characteristics.speedRunner) behaviorType = 'speed_runner'
  else if (characteristics.errorProne) behaviorType = 'error_prone'
  else if (characteristics.needsHelp) behaviorType = 'hesitant'

  // Calculate confidence score
  const confidenceScore = Math.min(
    adaptations.reduce((sum, a) => sum + a.confidence, 0) / adaptations.length,
    1.0
  )

  const profileData = {
    session_id: sessionId,
    behavior_type: behaviorType,
    confidence_score: confidenceScore,
    characteristics,
    updated_at: new Date().toISOString()
  }

  if (existingProfile) {
    // Update existing profile
    await supabase
      .from('user_profiles')
      .update(profileData)
      .eq('session_id', sessionId)
  } else {
    // Create new profile
    await supabase
      .from('user_profiles')
      .insert(profileData)
  }
}