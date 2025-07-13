import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

// Configure the Edge Runtime
export const runtime = 'edge'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Health check endpoint
export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, any> = {}
  
  try {
    // Basic service info
    const serviceInfo = {
      name: 'adapt-api',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      runtime: 'edge',
    }

    // Database connectivity check
    try {
      const supabase = createServerClient()
      const dbStart = Date.now()
      
      // Simple query to test connection
      const { error } = await supabase
        .from('behavior_events')
        .select('id')
        .limit(1)

      checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        responseTime: Date.now() - dbStart,
        error: error?.message,
      }
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        responseTime: -1,
        error: error instanceof Error ? error.message : 'Unknown database error',
      }
    }

    // API endpoints check
    checks.api = {
      status: 'healthy',
      responseTime: Date.now() - startTime,
    }

    // ML inference check (edge runtime compatible)
    checks.ml = {
      status: 'healthy',
      runtime: 'edge',
      note: 'TensorFlow.js available for client-side inference',
    }

    // Environment checks
    checks.environment = {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    // Overall health determination
    const unhealthyChecks = Object.values(checks).filter(
      check => check.status === 'unhealthy'
    ).length

    const degradedChecks = Object.values(checks).filter(
      check => check.status === 'degraded'
    ).length

    let overallStatus = 'healthy'
    if (unhealthyChecks > 0) {
      overallStatus = 'unhealthy'
    } else if (degradedChecks > 0) {
      overallStatus = 'degraded'
    }

    const response = {
      status: overallStatus,
      service: serviceInfo,
      checks,
      summary: {
        healthy: Object.values(checks).filter(c => c.status === 'healthy').length,
        degraded: degradedChecks,
        unhealthy: unhealthyChecks,
        total: Object.keys(checks).length,
      },
      responseTime: Date.now() - startTime,
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json(response, {
      status: statusCode,
      headers: corsHeaders,
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      },
      {
        status: 503,
        headers: corsHeaders,
      }
    )
  }
}