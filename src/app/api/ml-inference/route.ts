import { NextRequest, NextResponse } from 'next/server'
import { 
  BehaviorEvent, 
  FormAdaptation, 
  UserProfile,
  AdaptError 
} from '@/types'
import { 
  createAdaptError,
  generateEventId
} from '@/utils'
import { getMLManager } from '@/lib/ml'

// Configure Node.js Runtime (NOT Edge Runtime) for TensorFlow.js compatibility
export const runtime = 'nodejs'

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

// ML inference endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      sessionId, 
      events, 
      userProfile, 
      formContext 
    }: {
      sessionId: string
      events: BehaviorEvent[]
      userProfile?: UserProfile
      formContext: {
        formId: string
        deviceType: string
        formElements: {
          totalFields: number
          fieldTypes: string[]
          hasValidation: boolean
          layout: 'single-column' | 'multi-column' | 'grid'
        }
        currentAdaptations: FormAdaptation[]
        sessionStartTime: number
      }
    } = body

    if (!sessionId || !events || !formContext) {
      throw createAdaptError(
        'Missing required parameters: sessionId, events, formContext',
        'INVALID_REQUEST'
      )
    }

    // Get ML manager with Node.js compatible configuration
    const mlManager = getMLManager({
      modelBasePath: '/models',
      enableGPU: false, // Keep disabled for now
      maxAdaptationsPerSession: 10,
      confidenceThreshold: 0.3,
      debugging: process.env.NODE_ENV === 'development',
    })

    let adaptations: FormAdaptation[] = []
    let analysis: any = null

    try {
      // Try to initialize ML manager
      await mlManager.initialize()

      // Check if ML is actually working
      const status = mlManager.getStatus()
      if (status.initialized && status.mlEngine.initialized) {
        // Process session with ML
        const result = await mlManager.processSession(
          sessionId,
          formContext.formId,
          events,
          formContext,
          userProfile
        )

        adaptations = result.adaptations
        analysis = result.analysis

        if (process.env.NODE_ENV === 'development') {
          console.log('ML Analysis successful:', {
            sessionId,
            formId: formContext.formId,
            adaptationCount: adaptations.length,
            analysis: {
              userDifficulty: analysis.userDifficulty,
              engagementLevel: analysis.engagementLevel,
              completionLikelihood: analysis.completionLikelihood,
            }
          })
        }
      } else {
        throw new Error('ML engine not properly initialized')
      }

    } catch (mlError) {
      if (process.env.NODE_ENV === 'development') {
        console.log('ML inference failed, using enhanced rule-based system:', mlError)
      }
      
      // Enhanced rule-based fallback
      adaptations = await generateEnhancedRuleBasedAdaptations(
        sessionId,
        formContext.formId,
        events,
        userProfile,
        formContext
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        adaptations,
        analysis,
        sessionId,
        mlUsed: analysis !== null,
      },
      timestamp: Date.now(),
    }, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })

  } catch (error) {
    console.error('Error in ML inference API:', error)
    
    const adaptError = error instanceof AdaptError 
      ? error 
      : createAdaptError('ML inference error', 'ML_ERROR')

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

// Enhanced rule-based adaptation generation
async function generateEnhancedRuleBasedAdaptations(
  sessionId: string,
  formId: string,
  events: BehaviorEvent[],
  _userProfile?: UserProfile,
  _formContext?: any
): Promise<FormAdaptation[]> {
  const adaptations: FormAdaptation[] = []
  const timestamp = new Date().toISOString()

  // Analyze user behavior patterns
  const analysis = analyzeUserBehaviorPatterns(events)
  
  // Generate adaptations based on analysis
  if (analysis.isStruggling) {
    adaptations.push({
      id: generateEventId(),
      sessionId,
      formId,
      adaptationType: 'error_prevention',
      confidence: 0.7,
      parameters: {
        enableRealTimeValidation: true,
        enableInlineHelp: true,
        showHelpText: true,
      },
      config: {
        errorPrevention: {
          fieldName: analysis.strugglingField || '',
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
        source: 'enhanced_rule_based',
        userPattern: 'struggling',
        triggerEvents: analysis.triggerEvents,
      },
    })
  }

  if (analysis.isSpeedUser && events.length > 5) {
    adaptations.push({
      id: generateEventId(),
      sessionId,
      formId,
      adaptationType: 'progressive_disclosure',
      confidence: 0.6,
      parameters: {
        initialFields: 3,
        strategy: 'efficiency',
        enableFastTrack: true,
      },
      config: {
        progressiveDisclosure: {
          fieldsToReveal: analysis.recommendedFieldOrder.slice(3),
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
        source: 'enhanced_rule_based',
        userPattern: 'speed_user',
        fieldAnalysis: analysis.fieldInteractionTimes,
      },
    })
  }

  if (analysis.isMobileUser) {
    adaptations.push({
      id: generateEventId(),
      sessionId,
      formId,
      adaptationType: 'context_switching',
      confidence: 0.8,
      parameters: {
        mobileOptimized: true,
        reducedFields: true,
        largerTouchTargets: true,
      },
      config: {
        contextSwitching: {
          showFields: analysis.essentialFields,
          hideFields: analysis.optionalFields,
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
        source: 'enhanced_rule_based',
        userPattern: 'mobile_user',
        deviceInfo: analysis.deviceInfo,
      },
    })
  }

  if (analysis.needsGuidance) {
    adaptations.push({
      id: generateEventId(),
      sessionId,
      formId,
      adaptationType: 'completion_guidance',
      confidence: 0.5,
      parameters: {
        showProgress: true,
        confirmationMessages: true,
        fieldValidation: true,
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
      description: 'Completion guidance for methodical users',
      metadata: {
        source: 'enhanced_rule_based',
        userPattern: 'needs_guidance',
        sessionLength: analysis.sessionDuration,
      },
    })
  }

  return adaptations
}

// Analyze user behavior patterns for rule-based decisions
function analyzeUserBehaviorPatterns(events: BehaviorEvent[]) {
  const keyEvents = events.filter(e => e.eventType === 'key_press')
  const focusEvents = events.filter(e => e.eventType === 'focus')

  // Calculate session duration
  const sessionDuration = events.length > 1 
    ? (events[events.length - 1]?.timestamp || 0) - (events[0]?.timestamp || 0)
    : 0

  // Detect struggling patterns
  const backspaceEvents = keyEvents.filter(e => e.data.key === 'Backspace')
  const errorRate = keyEvents.length > 0 ? backspaceEvents.length / keyEvents.length : 0
  const isStruggling = errorRate > 0.2 || sessionDuration > 300000 // >5 min

  // Detect speed user patterns
  const eventsPerSecond = events.length / (sessionDuration / 1000)
  const isSpeedUser = eventsPerSecond > 0.5 && errorRate < 0.1

  // Detect mobile users
  const userAgent = events[0]?.userAgent || ''
  const isMobileUser = /mobile|android|iphone|ipad/i.test(userAgent)

  // Detect if user needs guidance
  const avgTimeBetweenActions = sessionDuration / events.length
  const needsGuidance = avgTimeBetweenActions > 10000 && !isSpeedUser // >10s between actions

  // Field interaction analysis
  const fieldInteractionTimes: Record<string, number> = {}
  const fieldOrder: string[] = []
  
  focusEvents.forEach((event, index) => {
    const fieldName = event.fieldName
    if (fieldName) {
      if (!fieldInteractionTimes[fieldName]) {
        fieldInteractionTimes[fieldName] = 0
        fieldOrder.push(fieldName)
      }
      
      const nextEvent = focusEvents[index + 1]
      if (nextEvent) {
        fieldInteractionTimes[fieldName] += nextEvent.timestamp - event.timestamp
      }
    }
  })

  // Recommend field order based on interaction patterns
  const recommendedFieldOrder = fieldOrder.sort((a, b) => 
    (fieldInteractionTimes[a] || 0) - (fieldInteractionTimes[b] || 0)
  )

  // Identify struggling field
  const strugglingField = Object.entries(fieldInteractionTimes)
    .sort(([,a], [,b]) => b - a)[0]?.[0]

  // Categorize fields
  const essentialFields = recommendedFieldOrder.slice(0, 3)
  const optionalFields = recommendedFieldOrder.slice(3)

  return {
    sessionDuration,
    isStruggling,
    isSpeedUser,
    isMobileUser,
    needsGuidance,
    errorRate,
    eventsPerSecond,
    fieldInteractionTimes,
    recommendedFieldOrder,
    strugglingField,
    essentialFields,
    optionalFields,
    triggerEvents: isStruggling ? ['high_error_rate', 'long_session'] : [],
    deviceInfo: { userAgent, isMobile: isMobileUser },
  }
}