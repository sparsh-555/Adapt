import { Suspense } from 'react'
import { BarChart3, Brain, Users, TrendingUp } from 'lucide-react'
import { Analytics } from './components/Analytics'
import { RealtimeUpdates } from './components/RealtimeUpdates'
import { FormsList } from './components/FormsList'
import { MetricCard } from './components/MetricCard'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Adapt Dashboard</h1>
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                Live
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Add New Form
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Suspense fallback={<MetricCardSkeleton />}>
            <MetricCard
              title="Total Forms"
              value="24"
              change="+3"
              changeType="increase"
              icon={<BarChart3 className="w-6 h-6 text-blue-600" />}
            />
          </Suspense>
          <Suspense fallback={<MetricCardSkeleton />}>
            <MetricCard
              title="Active Sessions"
              value="1,247"
              change="+12%"
              changeType="increase"
              icon={<Users className="w-6 h-6 text-green-600" />}
            />
          </Suspense>
          <Suspense fallback={<MetricCardSkeleton />}>
            <MetricCard
              title="Avg Conversion"
              value="68.5%"
              change="+25%"
              changeType="increase"
              icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
            />
          </Suspense>
          <Suspense fallback={<MetricCardSkeleton />}>
            <MetricCard
              title="Adaptations Applied"
              value="15,432"
              change="+187%"
              changeType="increase"
              icon={<Brain className="w-6 h-6 text-orange-600" />}
            />
          </Suspense>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Analytics Charts */}
          <div className="lg:col-span-2">
            <Suspense fallback={<AnalyticsSkeleton />}>
              <Analytics />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Suspense fallback={<div className="bg-white rounded-lg shadow h-64 animate-pulse" />}>
              <RealtimeUpdates />
            </Suspense>
            
            <Suspense fallback={<div className="bg-white rounded-lg shadow h-64 animate-pulse" />}>
              <FormsList />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded mb-4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  )
}