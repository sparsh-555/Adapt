import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const formId = searchParams.get('formId')
    const timeframe = searchParams.get('timeframe') || '30d'
    
    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      )
    }

    // Calculate date range based on timeframe
    const endDate = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1)
        break
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    // Get form metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('form_metrics')
      .select('*')
      .eq('form_id', formId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (metricsError) {
      console.error('Error fetching form metrics:', metricsError)
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      )
    }

    // Get behavior events summary
    const { data: behaviorSummary, error: behaviorError } = await supabase
      .from('behavior_events')
      .select('event_type, created_at')
      .eq('form_id', formId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (behaviorError) {
      console.error('Error fetching behavior events:', behaviorError)
      return NextResponse.json(
        { error: 'Failed to fetch behavior data' },
        { status: 500 }
      )
    }

    // Get user profiles summary
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('behavior_type, confidence_score, characteristics')
      .gte('updated_at', startDate.toISOString())
      .lte('updated_at', endDate.toISOString())

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError)
    }

    // Get adaptations summary
    const { data: adaptations, error: adaptationsError } = await supabase
      .from('adaptations')
      .select('adaptation_type, applied_at, performance_impact')
      .eq('form_id', formId)
      .gte('applied_at', startDate.toISOString())
      .lte('applied_at', endDate.toISOString())

    if (adaptationsError) {
      console.error('Error fetching adaptations:', adaptationsError)
    }

    // Process and aggregate data
    const analytics = {
      overview: calculateOverviewMetrics(metrics || []),
      conversionTrend: calculateConversionTrend(metrics || []),
      behaviorDistribution: calculateBehaviorDistribution(profiles || []),
      adaptationPerformance: calculateAdaptationPerformance(adaptations || []),
      eventVolume: calculateEventVolume(behaviorSummary || []),
      timeframe,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error in analytics endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateOverviewMetrics(metrics: any[]) {
  if (metrics.length === 0) {
    return {
      totalSessions: 0,
      completedSessions: 0,
      conversionRate: 0,
      averageCompletionTime: 0,
      adaptationsApplied: 0,
      conversionImprovement: 0
    }
  }

  const totalSessions = metrics.reduce((sum, m) => sum + (m.total_sessions || 0), 0)
  const completedSessions = metrics.reduce((sum, m) => sum + (m.completed_sessions || 0), 0)
  const adaptationsApplied = metrics.reduce((sum, m) => sum + (m.adaptations_applied || 0), 0)
  
  const conversionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
  const averageImprovement = metrics.reduce((sum, m) => sum + (m.conversion_improvement || 0), 0) / metrics.length
  
  // Calculate average completion time
  const completionTimes = metrics
    .filter(m => m.avg_completion_time)
    .map(m => parseTimeInterval(m.avg_completion_time))
  
  const averageCompletionTime = completionTimes.length > 0 
    ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
    : 0

  return {
    totalSessions,
    completedSessions,
    conversionRate: Math.round(conversionRate * 100) / 100,
    averageCompletionTime: Math.round(averageCompletionTime),
    adaptationsApplied,
    conversionImprovement: Math.round(averageImprovement * 100) / 100
  }
}

function calculateConversionTrend(metrics: any[]) {
  return metrics.map(m => ({
    date: m.date,
    baseline: calculateBaseline(m.total_sessions, m.completed_sessions, m.conversion_improvement),
    adapted: m.total_sessions > 0 ? (m.completed_sessions / m.total_sessions) * 100 : 0,
    sessions: m.total_sessions || 0
  }))
}

function calculateBaseline(totalSessions: number, completedSessions: number, improvement: number): number {
  if (totalSessions === 0) return 0
  
  const currentRate = (completedSessions / totalSessions) * 100
  const improvementFactor = improvement / 100
  
  // Reverse calculate baseline
  const baselineRate = currentRate / (1 + improvementFactor)
  
  return Math.round(baselineRate * 100) / 100
}

function calculateBehaviorDistribution(profiles: any[]) {
  const behaviorCounts = profiles.reduce((counts, profile) => {
    const behaviorType = profile.behavior_type || 'unknown'
    counts[behaviorType] = (counts[behaviorType] || 0) + 1
    return counts
  }, {} as Record<string, number>)

  const total = profiles.length
  
  return Object.entries(behaviorCounts).map(([type, count]) => ({
    type: formatBehaviorType(type),
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  }))
}

function calculateAdaptationPerformance(adaptations: any[]) {
  const adaptationStats = adaptations.reduce((stats, adaptation) => {
    const type = adaptation.adaptation_type
    if (!stats[type]) {
      stats[type] = {
        name: formatAdaptationType(type),
        applied: 0,
        successful: 0,
        totalImpact: 0
      }
    }
    
    stats[type].applied += 1
    
    if (adaptation.performance_impact) {
      const impact = adaptation.performance_impact
      if (impact.successful) {
        stats[type].successful += 1
      }
      if (impact.improvementScore) {
        stats[type].totalImpact += impact.improvementScore
      }
    }
    
    return stats
  }, {} as Record<string, any>)

  return Object.values(adaptationStats).map((stat: any) => ({
    name: stat.name,
    applied: stat.applied,
    success: stat.applied > 0 ? Math.round((stat.successful / stat.applied) * 100) : 0,
    avgImpact: stat.successful > 0 ? Math.round(stat.totalImpact / stat.successful) : 0
  }))
}

function calculateEventVolume(events: any[]) {
  const eventCounts = events.reduce((counts, event) => {
    const hour = new Date(event.created_at).getHours()
    counts[hour] = (counts[hour] || 0) + 1
    return counts
  }, {} as Record<number, number>)

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: eventCounts[hour] || 0
  }))
}

function parseTimeInterval(interval: string): number {
  // Parse PostgreSQL interval format to milliseconds
  const parts = interval.match(/(\d+):(\d+):(\d+)/)
  if (!parts) return 0
  
  const hours = parseInt(parts[1])
  const minutes = parseInt(parts[2])
  const seconds = parseInt(parts[3])
  
  return (hours * 3600 + minutes * 60 + seconds) * 1000
}

function formatBehaviorType(type: string): string {
  switch (type) {
    case 'speed_runner':
      return 'Speed Runner'
    case 'error_prone':
      return 'Error Prone'
    case 'mobile_user':
      return 'Mobile User'
    case 'methodical':
      return 'Methodical'
    case 'hesitant':
      return 'Hesitant'
    default:
      return 'Average'
  }
}

function formatAdaptationType(type: string): string {
  switch (type) {
    case 'field_reorder':
      return 'Field Reordering'
    case 'progressive_disclosure':
      return 'Progressive Disclosure'
    case 'smart_validation':
      return 'Smart Validation'
    case 'contextual_help':
      return 'Contextual Help'
    default:
      return type
  }
}