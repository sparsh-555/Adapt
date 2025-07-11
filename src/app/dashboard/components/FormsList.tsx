'use client'

import { useState } from 'react'
import { MoreHorizontal, TrendingUp, TrendingDown, ExternalLink, Settings } from 'lucide-react'

interface FormData {
  id: string
  name: string
  url: string
  sessions: number
  conversionRate: number
  improvement: number
  status: 'active' | 'paused' | 'draft'
  lastUpdated: Date
}

const mockForms: FormData[] = [
  {
    id: '1',
    name: 'Signup Form',
    url: 'https://example.com/signup',
    sessions: 1247,
    conversionRate: 68.5,
    improvement: 25.3,
    status: 'active',
    lastUpdated: new Date('2024-01-07T10:30:00')
  },
  {
    id: '2',
    name: 'Newsletter Subscribe',
    url: 'https://example.com/newsletter',
    sessions: 892,
    conversionRate: 45.2,
    improvement: 18.7,
    status: 'active',
    lastUpdated: new Date('2024-01-07T09:15:00')
  },
  {
    id: '3',
    name: 'Contact Form',
    url: 'https://example.com/contact',
    sessions: 534,
    conversionRate: 72.1,
    improvement: 32.4,
    status: 'active',
    lastUpdated: new Date('2024-01-07T08:45:00')
  },
  {
    id: '4',
    name: 'Demo Request',
    url: 'https://example.com/demo',
    sessions: 445,
    conversionRate: 55.8,
    improvement: 12.1,
    status: 'paused',
    lastUpdated: new Date('2024-01-06T16:20:00')
  },
  {
    id: '5',
    name: 'Free Trial',
    url: 'https://example.com/trial',
    sessions: 712,
    conversionRate: 61.3,
    improvement: 28.9,
    status: 'active',
    lastUpdated: new Date('2024-01-07T11:00:00')
  }
]

export function FormsList() {
  const [forms] = useState<FormData[]>(mockForms)
  const [selectedForm, setSelectedForm] = useState<string | null>(null)

  const getStatusColor = (status: FormData['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ago`
    } else if (minutes > 0) {
      return `${minutes}m ago`
    } else {
      return 'Just now'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Active Forms</h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {forms.map((form) => (
            <div 
              key={form.id} 
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedForm(form.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900">{form.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(form.status)}`}>
                      {form.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{form.url}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Sessions:</span>
                      <span className="font-medium text-gray-900 ml-1">{form.sessions.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Conversion:</span>
                      <span className="font-medium text-gray-900 ml-1">{form.conversionRate}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">+{form.improvement}%</span>
                      <span className="text-sm text-gray-500">improvement</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatTimeAgo(form.lastUpdated)}</span>
                  </div>
                </div>
                
                <div className="flex-shrink-0 ml-4">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Settings className="w-4 h-4 mr-2" />
            Manage Forms
          </button>
        </div>
      </div>
    </div>
  )
}