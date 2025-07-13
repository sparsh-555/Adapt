# Adapt

> AI-Native Form Optimization Platform

Add one line of code, get 25% better form conversions within 30 days.

## Overview

Adapt is an intelligent form optimization platform that uses AI to analyze user behavior in real-time and automatically improve form conversions. By leveraging machine learning, behavioral tracking, and smart adaptations, Adapt helps businesses maximize their form completion rates without manual A/B testing.

## Key Features

- **🧠 Behavioral Tracking**: Real-time analysis of user interactions, typing patterns, and form navigation
- **⚡ Smart Adaptations**: AI-powered field reordering, progressive disclosure, and contextual assistance  
- **🚀 Edge ML Inference**: Sub-100ms decision making with TensorFlow.js running on Vercel Edge
- **📊 Real-time Optimization**: Continuous learning and adaptation based on user behavior
- **🔌 One-Line Integration**: Simple script integration with any existing form

## Quick Start

### 1. Installation

```bash
git clone https://github.com/sparshjain/Adapt.git
cd Adapt
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Development

```bash
npm run dev
```

### 4. Deploy

```bash
./scripts/deploy.sh production
```

## Integration

Add Adapt to any form with just two lines:

```html
<script src="https://your-domain.vercel.app/api/adapt-script/v1"></script>
<script>
  window.Adapt.init({
    apiUrl: 'https://your-domain.vercel.app',
    formSelector: 'form',
    debug: false
  });
</script>
```

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Vercel Edge Functions, Node.js
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **ML**: TensorFlow.js (client and server-side)
- **Real-time**: WebSockets, Supabase Realtime
- **Deployment**: Vercel, Supabase

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Forms  │───▶│  Adapt Platform  │───▶│   Supabase DB   │
│                 │    │                  │    │                 │
│ • Behavior Data │    │ • Edge ML        │    │ • User Sessions │
│ • Form Events   │    │ • Adaptations    │    │ • Behavior Data │
│ • User Actions  │    │ • Real-time      │    │ • ML Models     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Development Phases

### ✅ Phase 1: Foundation (Complete)
- [x] Next.js 15 + TypeScript Setup
- [x] Supabase Real-time Integration
- [x] Edge API Infrastructure  
- [x] Client-side Tracking Library
- [x] TensorFlow.js ML Pipeline

### 🚧 Phase 2: Core Features (In Progress)
- [ ] Advanced behavioral analysis
- [ ] ML-driven form adaptations
- [ ] A/B testing framework
- [ ] Performance analytics dashboard

### 📋 Phase 3: Scale & Enterprise
- [ ] Multi-tenant architecture
- [ ] Advanced customization
- [ ] Enterprise integrations
- [ ] White-label solutions

## Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # ESLint checks
npm run type-check      # TypeScript checks
npm run format          # Prettier formatting
npm run test            # Run all checks

# Database
npm run supabase:start  # Start local Supabase
npm run supabase:reset  # Reset local database
npm run supabase:push   # Push migrations
npm run supabase:pull   # Pull remote changes

# Deployment
npm run deploy          # Deploy to preview
npm run deploy:prod     # Deploy to production
```

## API Endpoints

- `POST /api/track` - Behavior tracking
- `GET /api/adapt-script/v1` - Client script
- `POST /api/ml-inference` - ML predictions
- `GET /api/websocket` - Real-time connection
- `GET /api/health` - Health check

## Environment Variables

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app

# ML Configuration (Optional)
ML_CONFIDENCE_THRESHOLD=0.3
MAX_ADAPTATIONS_PER_SESSION=10
ENABLE_ML_INFERENCE=true

# Feature Flags
ENABLE_REAL_TIME=true
ENABLE_PROGRESSIVE_DISCLOSURE=true
ENABLE_ERROR_PREVENTION=true
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Deployment

For detailed production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Support

- 📖 [Documentation](DEPLOYMENT.md)
- 🐛 [Report Issues](https://github.com/sparshjain/Adapt/issues)
- 💬 [Discussions](https://github.com/sparshjain/Adapt/discussions)

---

**Made with ❤️ by [Sparsh Jain](https://github.com/sparshjain)**