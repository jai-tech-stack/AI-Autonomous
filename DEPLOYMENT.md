# AI CEO Platform - Deployment Guide

## Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Supabase recommended)
- OpenAI API key (get from https://platform.openai.com)
- Stripe account (optional for payments)
- Railway account (backend hosting)
- Vercel account (frontend hosting)

---

## Backend Setup (Railway)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Variables
Create `.env` file in `backend/` with:

```env
# Database (Supabase)
DATABASE_URL=postgresql://user:password@host:5432/database?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/database

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-this

# OpenAI (REQUIRED for real AI responses)
OPENAI_API_KEY=sk-proj-your-openai-key-here

# Stripe (Optional - use test keys first)
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_PRICE_ID_PRO=price_xxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx

# Social Media (Optional for v1)
LINKEDIN_ACCESS_TOKEN=your-linkedin-token
LINKEDIN_AUTHOR_URN=urn:li:person:XXXXXX
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-secret

# Azure (Optional - for emotion detection)
AZURE_FACE_API_KEY=your-azure-key
AZURE_FACE_ENDPOINT=https://your-region.api.cognitive.microsoft.com

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Server
PORT=5000
NODE_ENV=development
```

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional - creates demo data)
npx ts-node prisma/seed.ts

# View database (optional)
npx prisma studio
```

### 4. Run Locally
```bash
npm run dev
```
Server should start on `http://localhost:5000`

### 5. Deploy to Railway

#### Option A: Via Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add

# Set environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set JWT_SECRET=your-secret
# ... (add all other env vars)

# Deploy
railway up
```

#### Option B: Via Railway Dashboard
1. Go to https://railway.app
2. Create new project
3. Connect GitHub repo
4. Add PostgreSQL service
5. In Variables tab, paste all env vars from above
6. Deploy automatically triggers

### 6. Run Migrations on Railway
```bash
railway run npx prisma migrate deploy
```

---

## Frontend Setup (Vercel)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Variables
Create `.env.local` in `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

For production (Vercel):
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### 3. Run Locally
```bash
npm run dev
```
Frontend should start on `http://localhost:3000`

### 4. Deploy to Vercel

#### Option A: Via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variable
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://your-backend.railway.app

# Deploy to production
vercel --prod
```

#### Option B: Via Vercel Dashboard
1. Go to https://vercel.com
2. Import your GitHub repository
3. Framework: Next.js (auto-detected)
4. Root directory: `frontend`
5. Add environment variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-backend.railway.app`
6. Deploy

---

## Post-Deployment Checklist

### Backend
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] Seed data loaded (optional: `npx ts-node prisma/seed.ts`)
- [ ] OpenAI API key configured and working
- [ ] Stripe webhook endpoint configured (if using payments)
- [ ] CORS allows frontend URL
- [ ] Health check: `GET https://your-backend.railway.app/api/health`

### Frontend
- [ ] API base URL points to Railway backend
- [ ] Login/Register working
- [ ] Chat with AI CEO responds (requires OpenAI key)
- [ ] Tasks can be created
- [ ] Analytics dashboard loads

---

## Stripe Setup (Optional)

### 1. Create Products & Prices
1. Go to Stripe Dashboard → Products
2. Create "Pro Plan" product
   - Monthly price: $29
   - Copy Price ID → `STRIPE_PRICE_ID_PRO`
3. Create "Enterprise Plan" product
   - Monthly price: $99
   - Copy Price ID → `STRIPE_PRICE_ID_ENTERPRISE`

### 2. Configure Webhook
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-backend.railway.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy Webhook Secret → `STRIPE_WEBHOOK_SECRET`

---

## LinkedIn Integration (Optional)

### Simple Token-Based (v1)
1. Get your LinkedIn access token via OAuth2 flow
2. Add to backend `.env`:
   ```env
   LINKEDIN_ACCESS_TOKEN=your-token
   LINKEDIN_AUTHOR_URN=urn:li:person:XXXXXX
   ```
3. Posts will publish to LinkedIn API

### Full OAuth (v2 - future)
- Implement LinkedIn OAuth2 flow
- Store tokens per organization in `Integration` table

---

## Testing

### Backend API Tests
```bash
cd backend
npm test
```

### Frontend E2E Tests (optional)
```bash
cd frontend
npm run test
```

### Manual Testing Checklist
- [ ] Register new user
- [ ] Create organization
- [ ] Chat with AI CEO (should get intelligent responses)
- [ ] Create a task (should execute)
- [ ] Add a lead to CRM
- [ ] Generate AI report
- [ ] View analytics
- [ ] Check usage limits

---

## Monitoring & Logs

### Railway
- View logs: Railway Dashboard → Deployments → Logs
- Monitor CPU/Memory: Metrics tab

### Vercel
- View logs: Vercel Dashboard → Deployment → Function logs
- Monitor errors: Vercel Analytics

### Database
- Prisma Studio: `npx prisma studio`
- Supabase Dashboard: SQL Editor, Table Editor

---

## Troubleshooting

### "OpenAI API key not set"
- Add `OPENAI_API_KEY` to backend environment variables
- Restart backend service

### "Failed to connect to database"
- Check `DATABASE_URL` is correct
- Ensure database allows connections from Railway IP
- For Supabase: use pooled connection URL

### "CORS error" in frontend
- Add frontend URL to CORS whitelist in backend
- Check `FRONTEND_URL` env var is set

### "Stripe webhook signature invalid"
- Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Use raw body parser for webhook endpoint

---

## Scaling

### Backend (Railway)
- Upgrade Railway plan for more resources
- Enable auto-scaling (Pro plan)
- Add Redis for caching (optional)

### Frontend (Vercel)
- Vercel auto-scales by default
- Add CDN caching headers
- Enable ISR (Incremental Static Regeneration)

### Database
- Supabase: Upgrade to larger plan
- Enable connection pooling (PgBouncer)
- Add read replicas for heavy traffic

---

## Security Hardening

- [ ] Rotate JWT_SECRET regularly
- [ ] Use HTTP-only cookies instead of localStorage for tokens
- [ ] Enable rate limiting on sensitive endpoints
- [ ] Implement CSP headers
- [ ] Enable HTTPS only (auto on Railway/Vercel)
- [ ] Add request signing for webhooks
- [ ] Audit dependencies (`npm audit`)

---

## Cost Estimates

### Monthly Costs (Estimated)
- **Railway** (backend): $5-20/month (Hobby to Pro)
- **Vercel** (frontend): $0-20/month (Free to Pro)
- **Supabase** (database): $0-25/month (Free to Pro)
- **OpenAI API**: $5-50/month (depends on usage)
- **Stripe**: 2.9% + $0.30 per transaction
- **Total**: ~$10-115/month

---

## Next Steps

1. Add D-ID avatar integration for video AI CEO
2. Implement Whisper for voice commands
3. Add DALL-E for image generation
4. Set up background job queue (BullMQ)
5. Add real-time notifications (WebSockets)
6. Implement SSO (Google, Microsoft)
7. Add mobile app (React Native)

---

## Support

For issues or questions:
- Check logs in Railway/Vercel dashboards
- Review environment variables
- Test API endpoints with Postman
- Verify database schema with Prisma Studio



