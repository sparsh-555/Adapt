import React from 'react'

export default function HomePage() {
  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='container mx-auto px-4 py-16'>
        <div className='text-center'>
          <h1 className='text-5xl font-bold text-gray-900 dark:text-white mb-6'>
            Adapt
          </h1>
          <p className='text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto'>
            AI-Native Form Optimization Platform
          </p>
          <p className='text-lg text-gray-500 dark:text-gray-400 mb-12'>
            Add one line of code, get 25% better form conversions within 30 days
          </p>
          
          <div className='grid md:grid-cols-3 gap-8 max-w-4xl mx-auto'>
            <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg'>
              <h3 className='text-xl font-semibold mb-3 text-gray-900 dark:text-white'>
                Behavioral Tracking
              </h3>
              <p className='text-gray-600 dark:text-gray-300'>
                Real-time analysis of user interactions, typing patterns, and form navigation
              </p>
            </div>
            
            <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg'>
              <h3 className='text-xl font-semibold mb-3 text-gray-900 dark:text-white'>
                Smart Adaptations
              </h3>
              <p className='text-gray-600 dark:text-gray-300'>
                AI-powered field reordering, progressive disclosure, and contextual assistance
              </p>
            </div>
            
            <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg'>
              <h3 className='text-xl font-semibold mb-3 text-gray-900 dark:text-white'>
                Edge ML Inference
              </h3>
              <p className='text-gray-600 dark:text-gray-300'>
                Sub-100ms decision making with TensorFlow.js running on Vercel Edge
              </p>
            </div>
          </div>
          
          <div className='mt-16 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl mx-auto'>
            <h2 className='text-2xl font-bold mb-4 text-gray-900 dark:text-white'>
              Phase 1: Foundation
            </h2>
            <div className='text-left space-y-2'>
              <div className='flex items-center'>
                <span className='w-3 h-3 bg-green-500 rounded-full mr-3'></span>
                <span className='text-gray-700 dark:text-gray-300'>Next.js 15 + TypeScript Setup</span>
              </div>
              <div className='flex items-center'>
                <span className='w-3 h-3 bg-green-500 rounded-full mr-3'></span>
                <span className='text-gray-700 dark:text-gray-300'>Supabase Real-time Integration</span>
              </div>
              <div className='flex items-center'>
                <span className='w-3 h-3 bg-yellow-500 rounded-full mr-3'></span>
                <span className='text-gray-700 dark:text-gray-300'>Edge API Infrastructure</span>
              </div>
              <div className='flex items-center'>
                <span className='w-3 h-3 bg-yellow-500 rounded-full mr-3'></span>
                <span className='text-gray-700 dark:text-gray-300'>Client-side Tracking Library</span>
              </div>
              <div className='flex items-center'>
                <span className='w-3 h-3 bg-gray-300 rounded-full mr-3'></span>
                <span className='text-gray-700 dark:text-gray-300'>TensorFlow.js ML Pipeline</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}