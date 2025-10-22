# Environment Variables Setup Guide

## Required Environment Variables

### Backend (.env)

```env
# ========================================
# DATABASE
# ========================================
# Primary connection URL (use pooled for serverless)
DATABASE_URL=postgresql://user:password@host:5432/database?pgbouncer=true

# Direct connection for migrations (no pooling)
DIRECT_URL=postgresql://user:password@host:5432/database

# ========================================
# AUTHENTICATION
# ========================================
# Secret key for JWT token signing (use long random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# ========================================
# OPENAI (REQUIRED for AI features)
# ========================================
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ========================================
# STRIPE (Optional - for payments)
# ========================================
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook secret from: https://dashboard.stripe.com/webhooks
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Price IDs from Stripe Dashboard → Products
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ========================================
# LINKEDIN (Optional - for social posting)
# ========================================
# Manual token approach (v1)
LINKEDIN_ACCESS_TOKEN=your-linkedin-access-token
LINKEDIN_AUTHOR_URN=urn:li:person:XXXXXX

# OAuth approach (v2 - future)
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret

# ========================================
# TWITTER/X (Optional - for social posting)
# ========================================
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
TWITTER_BEARER_TOKEN=your-bearer-token

# ========================================
# AZURE COGNITIVE SERVICES (Optional)
# ========================================
# For real emotion detection - Get from: https://portal.azure.com
AZURE_FACE_API_KEY=your-azure-face-api-key
AZURE_FACE_ENDPOINT=https://your-region.api.cognitive.microsoft.com

# ========================================
# D-ID (Optional - for avatar videos)
# ========================================
# Get from: https://studio.d-id.com/account-settings
DID_API_KEY=your-d-id-api-key

# ========================================
# EMAIL (Optional - for transactional emails)
# ========================================
# Nodemailer SMTP settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ========================================
# URLS
# ========================================
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# ========================================
# SERVER
# ========================================
PORT=5000
NODE_ENV=development
```

---

## Frontend (.env.local)

```env
# API Base URL (backend)
NEXT_PUBLIC_API_URL=http://localhost:5000

# For production:
# NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## How to Get Each API Key

### 1. OpenAI API Key ⭐ REQUIRED
1. Go to https://platform.openai.com
2. Sign up / Log in
3. Navigate to API Keys
4. Click "Create new secret key"
5. Copy the key (starts with `sk-proj-...`)
6. **Cost**: ~$5-20/month depending on usage

### 2. Stripe Keys (Optional)
1. Go to https://dashboard.stripe.com
2. Sign up / Log in
3. Get API keys from: Developers → API keys
   - **Secret key**: `sk_test_...` (for development)
   - **Publishable key**: `pk_test_...`
4. Create products:
   - Products → Create Product
   - Set price, copy Price ID (`price_...`)
5. Webhook secret:
   - Developers → Webhooks → Add endpoint
   - URL: `https://your-backend.railway.app/api/stripe/webhook`
   - Copy signing secret (`whsec_...`)

### 3. LinkedIn Token (Optional)
#### Simple Token Method (v1):
1. Use LinkedIn OAuth Playground or Postman
2. Get authorization code via OAuth2 flow
3. Exchange for access token
4. **Scope needed**: `w_member_social`

#### OAuth Method (v2 - recommended):
1. Create LinkedIn App: https://www.linkedin.com/developers/apps
2. Get Client ID & Secret
3. Implement OAuth2 flow in your app

### 4. Twitter/X API (Optional)
1. Go to https://developer.twitter.com
2. Create a new project/app
3. Enable OAuth 2.0
4. Get Client ID & Secret
5. **Scope needed**: `tweet.read tweet.write users.read`

### 5. Azure Face API (Optional)
1. Go to https://portal.azure.com
2. Create "Face" resource
3. Get API key and endpoint URL
4. **Free tier**: 30,000 transactions/month

### 6. D-ID API (Optional)
1. Go to https://studio.d-id.com
2. Sign up for account
3. Navigate to Account Settings → API Key
4. **Free tier**: Limited credits

---

## Database Setup (Supabase)

### 1. Create Database
1. Go to https://supabase.com
2. Create new project
3. Wait for database provisioning (~2 minutes)

### 2. Get Connection Strings
1. Project Settings → Database
2. Copy **Connection Pooling** URL for `DATABASE_URL`
3. Copy **Direct Connection** URL for `DIRECT_URL`

### 3. Example URLs
```env
# Pooled (for app runtime)
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct (for migrations)
DIRECT_URL=postgresql://postgres.xxxxx:password@aws-0-us-east-1.compute.amazonaws.com:5432/postgres
```

---

## Security Best Practices

### JWT_SECRET
```bash
# Generate secure random string (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Never Commit Secrets
- Add `.env` to `.gitignore`
- Use `.env.example` for templates
- Rotate keys if accidentally exposed

### Production vs Development
- Use different keys for dev/staging/prod
- Never use test Stripe keys in production
- Enable rate limiting on API endpoints

---

## Validation Checklist

Before deploying, verify:

- [ ] `DATABASE_URL` connects successfully
- [ ] `OPENAI_API_KEY` makes successful API calls
- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `FRONTEND_URL` matches your frontend domain
- [ ] `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- [ ] All optional keys are either set or features disabled

---

## Testing Environment Variables

### Backend Test
```bash
cd backend
node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY ? '✅ OpenAI configured' : '❌ Missing OpenAI key')"
```

### Database Test
```bash
cd backend
npx prisma db pull
# Should succeed if DATABASE_URL is correct
```

### API Test
```bash
curl http://localhost:5000/api/health
# Should return 200 OK
```

---

## Environment-Specific Configs

### Development (.env)
```env
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

### Staging (.env.staging)
```env
NODE_ENV=staging
FRONTEND_URL=https://staging.yourapp.com
BACKEND_URL=https://staging-api.yourapp.com
```

### Production (.env.production)
```env
NODE_ENV=production
FRONTEND_URL=https://yourapp.com
BACKEND_URL=https://api.yourapp.com
```

---

## Railway Environment Variables

Set via CLI:
```bash
railway variables set OPENAI_API_KEY=sk-...
railway variables set JWT_SECRET=your-secret
```

Or via Dashboard:
1. Railway project → Variables tab
2. Paste all env vars
3. Deploy automatically triggers

---

## Vercel Environment Variables

Set via CLI:
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter value when prompted
```

Or via Dashboard:
1. Vercel project → Settings → Environment Variables
2. Add `NEXT_PUBLIC_API_URL`
3. Redeploy to apply

---

## Troubleshooting

### "OPENAI_API_KEY is not set"
- Check `.env` file exists in `backend/` directory
- Verify `dotenv.config()` is called at top of `index.ts`
- Restart server after adding env var

### "Database connection failed"
- Test connection string with `npx prisma db pull`
- Ensure database allows connections from your IP
- Check for typos in connection URL

### "Stripe webhook verification failed"
- Ensure webhook secret matches Stripe dashboard
- Use raw body parser for webhook endpoint
- Check webhook endpoint URL in Stripe settings

---

## Quick Start Commands

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your keys
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev

# Frontend
cd frontend
cp .env.example .env.local
# Edit .env.local
npm install
npm run dev
```



