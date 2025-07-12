# Adapt Deployment Guide

This guide covers deploying the Adapt form optimization platform to production using Vercel and Supabase.

## Prerequisites

Before deploying, ensure you have:

- [Node.js 18+](https://nodejs.org/) installed
- [Vercel CLI](https://vercel.com/cli) installed: `npm i -g vercel`
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed: `npm i -g supabase`
- A [Vercel account](https://vercel.com)
- A [Supabase project](https://supabase.com)

## Quick Deployment

1. **Clone and Setup**
   ```bash
   git clone https://github.com/sparshjain/Adapt.git
   cd Adapt
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Deploy**
   ```bash
   ./scripts/deploy.sh production
   ```

## Detailed Setup

### 1. Supabase Configuration

#### Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Note your project URL and API keys

#### Database Setup
1. Run migrations:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

2. Enable Real-time:
   ```sql
   -- Run in Supabase SQL Editor
   CREATE PUBLICATION adapt_realtime FOR ALL TABLES;
   ```

3. Configure RLS policies (already included in migrations)

### 2. Environment Variables

Create `.env.local` with these values:

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

### 3. Vercel Configuration

#### Setup Vercel Project
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set framework preset to "Next.js"

#### Environment Variables in Vercel
Add these in your Vercel project settings:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Service Role Key | All |
| `NODE_ENV` | `production` | Production |

### 4. Domain Configuration

#### Custom Domain (Optional)
1. Add custom domain in Vercel dashboard
2. Update environment variables with your domain
3. Configure DNS records

#### CDN Setup
The client script is automatically served via Vercel's CDN at:
```
https://your-domain.vercel.app/api/adapt-script/v1
```

## Deployment Scripts

### Automated Deployment
```bash
# Deploy to preview
./scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh production
```

### Manual Deployment
```bash
# Install dependencies
npm install

# Run checks
npm run type-check
npm run lint
npm run build

# Deploy
vercel --prod
```

## API Endpoints

After deployment, these endpoints will be available:

- `POST /api/track` - Behavior tracking
- `GET /api/adapt-script/v1` - Client script
- `GET /api/websocket` - Real-time connection
- `OPTIONS /api/*` - CORS preflight

## Client Integration

Add to your forms:

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

## Monitoring & Debugging

### Vercel Analytics
Enable in Vercel dashboard for performance monitoring.

### Logs
```bash
# View function logs
vercel logs

# View real-time logs
vercel logs --follow
```

### Debug Mode
Set `NEXT_PUBLIC_DEBUG_MODE=true` for detailed logging.

## Performance Optimization

### Edge Functions
All API routes run on Vercel Edge Runtime for:
- Global distribution
- Sub-50ms latency
- Auto-scaling

### Caching Strategy
- Client script: 24h cache with stale-while-revalidate
- API responses: No cache for real-time data
- Static assets: Optimized via Vercel CDN

## Security Configuration

### CORS
Configured in `vercel.json` for cross-origin requests.

### Environment Security
- Sensitive keys in environment variables only
- Client-side keys properly scoped
- Service role key server-side only

## Scaling Considerations

### Database
- Supabase auto-scales up to your plan limits
- Consider connection pooling for high traffic
- Monitor real-time connections

### Edge Functions
- Auto-scale with Vercel's infrastructure
- No cold starts on Edge Runtime
- Global distribution included

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   npm run type-check
   npm run lint
   ```

2. **Environment Variable Issues**
   - Check Vercel dashboard configuration
   - Ensure all required variables are set
   - Verify Supabase project settings

3. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check RLS policies
   - Ensure migrations are applied

4. **Real-time Issues**
   - Verify real-time is enabled in Supabase
   - Check WebSocket connections
   - Monitor Edge Function logs

### Support
- Check [Vercel Documentation](https://vercel.com/docs)
- Check [Supabase Documentation](https://supabase.com/docs)
- Open issue on GitHub repository

## Rollback Strategy

### Quick Rollback
```bash
# Rollback to previous deployment
vercel rollback
```

### Database Rollback
```bash
# Rollback migrations if needed
supabase db reset
```

## Maintenance

### Regular Updates
- Monitor dependency security updates
- Update Supabase CLI regularly
- Keep Vercel CLI updated

### Backup Strategy
- Supabase provides automated backups
- Export critical data regularly
- Document configuration changes

---

## Quick Reference

### Commands
```bash
# Development
npm run dev
npm run type-check
npm run lint

# Deployment
./scripts/deploy.sh production
vercel --prod

# Database
supabase db push
supabase db reset

# Monitoring
vercel logs --follow
```

### URLs
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- Client Script: `https://your-domain.vercel.app/api/adapt-script/v1`
- API Base: `https://your-domain.vercel.app/api`