import { ArrowRight, BarChart3, Brain, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Adapt: AI-Native Form Optimization
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Add one line of code, get 25% better form conversions within 30 days
          </p>
          <div className="bg-slate-900 text-white p-4 rounded-lg font-mono text-sm mb-8 max-w-2xl mx-auto">
            <div className="text-slate-400">// Add to your form</div>
            <div>&lt;form data-adapt="signup" data-goal="conversion"&gt;</div>
            <div className="text-slate-400">  &lt;!-- Your existing form --&gt;</div>
            <div>&lt;/form&gt;</div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Brain className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Behavioral Learning</h3>
              <p className="text-slate-600">
                Tracks micro-interactions and learns user patterns to optimize form flow
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Zap className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Adaptation</h3>
              <p className="text-slate-600">
                Dynamically reorders fields and adjusts form behavior based on user type
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <BarChart3 className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Analytics & Insights</h3>
              <p className="text-slate-600">
                Comprehensive dashboard showing conversion improvements and user journeys
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-sm mb-8">
            <h2 className="text-2xl font-bold mb-4">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">1</div>
                <p className="text-sm">Add data attribute to your form</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">2</div>
                <p className="text-sm">Adapt tracks user behavior invisibly</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">3</div>
                <p className="text-sm">AI optimizes form in real-time</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">4</div>
                <p className="text-sm">See 25%+ conversion improvement</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="border-2 border-slate-300 hover:border-slate-400 text-slate-700 px-8 py-3 rounded-lg font-semibold">
              View Dashboard Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}