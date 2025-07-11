'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Mock data - in production, this would come from your API
const conversionData = [
  { date: '2024-01-01', baseline: 42, adapted: 58 },
  { date: '2024-01-02', baseline: 45, adapted: 62 },
  { date: '2024-01-03', baseline: 38, adapted: 55 },
  { date: '2024-01-04', baseline: 41, adapted: 59 },
  { date: '2024-01-05', baseline: 44, adapted: 65 },
  { date: '2024-01-06', baseline: 43, adapted: 61 },
  { date: '2024-01-07', baseline: 40, adapted: 63 },
]

const behaviorData = [
  { type: 'Speed Runner', count: 1247, percentage: 35 },
  { type: 'Methodical', count: 892, percentage: 25 },
  { type: 'Error Prone', count: 534, percentage: 15 },
  { type: 'Hesitant', count: 445, percentage: 12 },
  { type: 'Mobile User', count: 712, percentage: 20 },
]

const adaptationData = [
  { name: 'Field Reordering', applied: 2134, success: 87 },
  { name: 'Progressive Disclosure', applied: 1876, success: 92 },
  { name: 'Smart Validation', applied: 1543, success: 78 },
  { name: 'Contextual Help', applied: 1234, success: 85 },
]

export function Analytics() {
  const [activeTab, setActiveTab] = useState('conversion')

  const tabs = [
    { id: 'conversion', label: 'Conversion Rates' },
    { id: 'behavior', label: 'User Behavior' },
    { id: 'adaptations', label: 'Adaptations' }
  ]

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'conversion' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Conversion Rate Comparison</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Baseline</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">With Adapt</span>
                </div>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [`${value}%`, name === 'baseline' ? 'Baseline' : 'With Adapt']}
                />
                <Line 
                  type="monotone" 
                  dataKey="baseline" 
                  stroke="#9CA3AF" 
                  strokeWidth={2}
                  dot={{ fill: '#9CA3AF' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="adapted" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
            
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">25.3%</div>
                <div className="text-sm text-gray-600">Average Improvement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">68.5%</div>
                <div className="text-sm text-gray-600">Current Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">43.2%</div>
                <div className="text-sm text-gray-600">Baseline Rate</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'behavior' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">User Behavior Types</h3>
              <div className="text-sm text-gray-600">
                Last 30 days • {behaviorData.reduce((sum, item) => sum + item.count, 0)} users
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={behaviorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Users' : 'Percentage']} />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-6 space-y-4">
              {behaviorData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{item.type}</div>
                    <div className="text-sm text-gray-600">{item.count} users</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'adaptations' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Adaptation Performance</h3>
              <div className="text-sm text-gray-600">
                Success rate measures positive user response
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={adaptationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="applied" fill="#8B5CF6" name="Applied" />
                <Bar dataKey="success" fill="#10B981" name="Success Rate %" />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-6 space-y-4">
              {adaptationData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-600">{item.applied} times applied</div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{item.success}%</div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.success >= 90 ? 'bg-green-100 text-green-800' :
                      item.success >= 80 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.success >= 90 ? 'Excellent' : item.success >= 80 ? 'Good' : 'Needs Improvement'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}