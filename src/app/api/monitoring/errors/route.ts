import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { createAdaptError } from '@/utils'

// Configure the Edge Runtime
export const runtime = 'edge'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Handle error and metrics reporting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { errors, metrics, sessionId, timestamp } = body

    // Validate request body
    if (!sessionId || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createServerClient()
    const results = []

    // Store errors if present
    if (errors && Array.isArray(errors) && errors.length > 0) {
      const errorRecords = errors.map(error => ({
        session_id: sessionId,
        error_name: error.name || 'Unknown',
        error_message: error.message || '',
        error_stack: error.stack || '',
        context: error.context || {},
        severity: error.context?.severity || 'medium',
        timestamp: new Date(error.context?.timestamp || timestamp).toISOString(),
        user_agent: error.context?.userAgent || request.headers.get('user-agent'),
        url: error.context?.url || request.headers.get('referer'),
        tags: error.context?.tags || {},
      }))

      const { error: errorInsertError } = await supabase
        .from('error_logs')
        .insert(errorRecords)

      if (errorInsertError) {
        console.error('Failed to store errors:', errorInsertError)
        results.push({ type: 'errors', status: 'failed', error: errorInsertError.message })
      } else {
        results.push({ type: 'errors', status: 'success', count: errorRecords.length })
      }
    }

    // Store metrics if present
    if (metrics && Array.isArray(metrics) && metrics.length > 0) {
      const metricRecords = metrics.map(metric => ({
        session_id: sessionId,
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        tags: metric.tags || {},
        timestamp: new Date(metric.timestamp).toISOString(),
      }))

      const { error: metricInsertError } = await supabase
        .from('performance_metrics')
        .insert(metricRecords)

      if (metricInsertError) {
        console.error('Failed to store metrics:', metricInsertError)
        results.push({ type: 'metrics', status: 'failed', error: metricInsertError.message })
      } else {
        results.push({ type: 'metrics', status: 'success', count: metricRecords.length })
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Monitoring data received:', {
        sessionId,
        errorCount: errors?.length || 0,
        metricCount: metrics?.length || 0,
        results,
      })
    }

    return NextResponse.json(
      {
        success: true,
        results,
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    )

  } catch (error) {
    console.error('Error in monitoring API:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process monitoring data',
        timestamp: Date.now(),
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      service: 'adapt-monitoring',
      timestamp: Date.now(),
      version: '1.0.0',
    },
    {
      status: 200,
      headers: corsHeaders,
    }
  )
}