'use client'

import { useEffect, useState } from 'react'
import { Activity, Users, Zap, AlertTriangle } from 'lucide-react'

interface RealtimeUpdate {
  id: string
  type: 'session' | 'adaptation' | 'error' | 'conversion'
  message: string
  timestamp: Date
  severity: 'info' | 'success' | 'warning' | 'error'
}

export function RealtimeUpdates() {
  const [updates, setUpdates] = useState<RealtimeUpdate[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      const newUpdate: RealtimeUpdate = {
        id: Date.now().toString(),
        type: ['session', 'adaptation', 'error', 'conversion'][Math.floor(Math.random() * 4)] as any,
        message: generateRandomMessage(),
        timestamp: new Date(),
        severity: ['info', 'success', 'warning', 'error'][Math.floor(Math.random() * 4)] as any
      }
      
      setUpdates(prev => [newUpdate, ...prev.slice(0, 9)]) // Keep last 10 updates
    }, 3000)

    setIsConnected(true)
    
    return () => clearInterval(interval)
  }, [])

  const generateRandomMessage = (): string => {
    const messages = [
      'New user session started on signup form',
      'Field reordering adaptation applied successfully',
      'Progressive disclosure triggered for mobile user',
      'Smart validation prevented form error',
      'Form completion rate increased by 12%',
      'Contextual help displayed for hesitant user',
      'Speed runner behavior detected',
      'Error prone user pattern identified',
      'Form submission completed successfully',
      'Real-time adaptation confidence: 87%'
    ]
    
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const getUpdateIcon = (type: RealtimeUpdate['type']) => {
    switch (type) {
      case 'session':
        return <Users className="w-4 h-4" />
      case 'adaptation':
        return <Zap className="w-4 h-4" />
      case 'error':
        return <AlertTriangle className="w-4 h-4" />
      case 'conversion':
        return <Activity className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getSeverityColor = (severity: RealtimeUpdate['severity']) => {
    switch (severity) {
      case 'info':
        return 'text-blue-600 bg-blue-50'
      case 'success':
        return 'text-green-600 bg-green-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Real-time Activity</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {updates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Waiting for real-time updates...</p>
            </div>
          ) : (
            updates.map((update) => (
              <div key={update.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className={`flex-shrink-0 p-2 rounded-full ${getSeverityColor(update.severity)}`}>
                  {getUpdateIcon(update.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{update.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {update.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}