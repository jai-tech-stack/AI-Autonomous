# 🏗️ AI CEO Platform - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│                    (Next.js Frontend)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │   Chat   │  │   CRM    │  │Analytics │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY                             │
│                  (Express.js Backend)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Auth Middleware (JWT) + RBAC + Usage Limits         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Auth    │  │   Chat   │  │  Tasks   │  │   CRM    │  │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└────────────┬─────────────┬──────────┬──────────────────────┘
             │             │          │
             ▼             ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS SERVICES                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  OpenAI  │  │  Stripe  │  │ LinkedIn │  │ Agentic  │  │
│  │ Service  │  │ Service  │  │ Service  │  │  Engine  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐  ┌──────────┐                                 │
│  │  Neural  │  │ Emotion  │                                 │
│  │ Network  │  │ Detection│                                 │
│  └──────────┘  └──────────┘                                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Prisma)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Users   │  │   Orgs   │  │  Leads   │  │  Tasks   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                       │
│                      25 Tables                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  BACKGROUND WORKERS                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Task Executor (Every 60s)                           │  │
│  │  - Processes PENDING tasks                           │  │
│  │  - Updates status, output, errors                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Agentic Engine (Every 3600s)                        │  │
│  │  - Analyzes all Pro/Enterprise orgs                  │  │
│  │  - Identifies insights, executes actions             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ OpenAI   │  │  Stripe  │  │ LinkedIn │  │  Azure   │  │
│  │   API    │  │   API    │  │   API    │  │  Face    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Request Flow

### 1. User Chat with AI CEO

```
User types message
    ↓
Frontend (app/dashboard/chat/page.tsx)
    ↓
API Client (lib/api.ts) → POST /api/chat/message
    ↓
Auth Middleware (validates JWT token)
    ↓
Chat Route Handler (index.ts:365)
    ↓
Fetch AI Config & Conversation History (Prisma)
    ↓
OpenAI Service (services/openai.ts)
    ↓
GPT-4 API Call (with system prompt + history)
    ↓
Save user message + AI response (Prisma)
    ↓
Return response to frontend
    ↓
Display in chat UI
```

### 2. Agentic Engine Hourly Analysis

```
setInterval (every 3600s)
    ↓
Fetch all Pro/Enterprise organizations
    ↓
For each organization:
    ↓
    Agentic Engine: analyzeAndAct()
        ↓
        Gather Data (leads, tasks, posts)
        ↓
        Identify Insights
        ├─ Stale leads? → confidence 0.9
        ├─ Low content? → confidence 0.8
        └─ Task backlog? → confidence 0.85
        ↓
        Execute Actions (if confidence > 0.75)
        ├─ Create follow-up tasks
        ├─ Generate social posts
        └─ Log warnings
        ↓
        Save new tasks to database
    ↓
Log results (✅ actions taken)
```

### 3. Autonomous Task Execution

```
setInterval (every 60s)
    ↓
Fetch PENDING tasks
    ↓
For each task:
    ↓
    Update status → IN_PROGRESS
    ↓
    Switch on taskType:
    ├─ social_media_post
    │   ↓
    │   OpenAI: generate content
    │   ↓
    │   LinkedIn Service: post()
    │   ↓
    │   Save output (post ID, URL)
    │
    ├─ email_campaign
    │   ↓
    │   OpenAI: generate email
    │   ↓
    │   Nodemailer: send()
    │   ↓
    │   Save metrics
    │
    └─ lead_followup
        ↓
        OpenAI: generate message
        ↓
        Update lead activity
        ↓
        Save notes
    ↓
    Update status → COMPLETED
    ↓
    Record usage
```

---

## Data Flow

### Database Schema Relationships

```
User ─────┬───── Subscription
          │
          └───── OrganizationMember ───── Organization
                                              │
                 ┌────────────────────────────┼──────────────────┐
                 │                            │                  │
           AiCeoConfig                   ChatMessage        AutonomousTask
                                                                  │
                 ┌────────────────────────────┼──────────────────┤
                 │                            │                  │
            SalesLead                    ContentPost       Integration
                 │
                 ├──── LeadActivity
                 └──── Meeting
```

### Key Entities

1. **User** - Individual account holder
2. **Organization** - Company/team workspace
3. **OrganizationMember** - User-Org relationship with role
4. **AiCeoConfig** - AI personality, goals, industry
5. **ChatMessage** - Conversation history
6. **AutonomousTask** - Background jobs queue
7. **SalesLead** - CRM contact
8. **ContentPost** - Scheduled social posts
9. **Integration** - OAuth tokens for LinkedIn, Twitter, etc.
10. **Subscription** - Stripe subscription state

---

## Service Architecture

### OpenAI Service (`services/openai.ts`)

```typescript
generateAIResponse(messages, model, temp, maxTokens)
    ↓
    OpenAI SDK → GPT-4 API
    ↓
    Return response text

generateAgenticResponse(userMessage, systemPrompt, history)
    ↓
    Build full conversation context
    ↓
    Call generateAIResponse()
    ↓
    Return contextual response
```

**Used by**:
- Chat endpoint
- Task executor (content generation)
- AI reports (insights)

### Stripe Service (`services/stripe.ts`)

```typescript
createCheckoutSession(priceId, urls, metadata)
    ↓
    Stripe SDK → Create session
    ↓
    Return session.id, session.url

constructWebhookEvent(rawBody, signature)
    ↓
    Verify webhook signature
    ↓
    Return event object
```

**Used by**:
- `/api/stripe/create-checkout` endpoint
- `/api/stripe/webhook` endpoint

### LinkedIn Service (`services/linkedin.ts`)

```typescript
postToLinkedIn(accessToken, authorUrn, text)
    ↓
    LinkedIn UGC Posts API v2
    ↓
    POST with OAuth token
    ↓
    Return post ID
```

**Used by**:
- `/api/integrations/linkedin/post` endpoint
- Task executor (social_media_post tasks)

### Agentic Engine (`services/agentic-engine.ts`)

```typescript
analyzeAndAct(organizationId)
    ↓
    identifyInsights(leads, tasks, posts)
        ↓
        Check for stale leads
        Check content output
        Check task backlog
        ↓
        Return insights array
    ↓
    executeAction(insight)
        ↓
        Switch on insight.type:
        ├─ stale_leads → create follow-up tasks
        ├─ low_content_output → create post task
        └─ task_backlog → log warning
    ↓
    Return { insights, actions }
```

**Runs**:
- Every hour automatically
- Manual trigger: `POST /api/agentic/analyze`

### Neural Network (`services/neural-network.ts`)

```typescript
trainOnBusinessData(leads, tasks)
    ↓
    Calculate conversion rate
    Calculate task success rate
    ↓
    Store training data
    ↓
    Return accuracy metrics

predictLeadConversion(leadFeatures)
    ↓
    Heuristic scoring:
    - Priority +0.2
    - Company +0.1
    - Activities +0.15
    - Source +0.05
    ↓
    Return score 0-1
```

**Future**: Replace with TensorFlow.js models

---

## Authentication & Authorization

### JWT Flow

```
User login with email/password
    ↓
Backend validates credentials
    ↓
Generate JWT token (includes userId, email)
    ↓
Sign with JWT_SECRET
    ↓
Return token to frontend
    ↓
Frontend stores in localStorage
    ↓
Every API request:
    Frontend includes "Authorization: Bearer TOKEN"
    ↓
    authMiddleware verifies token
    ↓
    Decode userId, email
    ↓
    Attach to req.user
    ↓
    Next()
```

### RBAC (Role-Based Access Control)

```
orgGuard(requiredRole?)
    ↓
    Extract organizationId from request
    ↓
    Fetch OrganizationMember for userId + organizationId
    ↓
    Check membership exists
    ↓
    If requiredRole specified:
        ↓
        Compare role levels:
        owner (3) > admin (2) > member (1)
        ↓
        Deny if insufficient
    ↓
    Attach organizationId to request
    ↓
    Next()
```

**Roles**:
- **Owner**: Can delete org, manage billing, all admin permissions
- **Admin**: Can invite members, change roles, manage resources
- **Member**: Can view, create tasks, use features

### Usage Limits

```
enforceUsage(resource, count)
    ↓
    Get organization plan (free/pro/enterprise)
    ↓
    Fetch usage for current month
    ↓
    Check: currentUsage + count <= limit?
    ↓
    If exceeded → 402 Payment Required
    ↓
    Else → Next()
```

**Limits**:
- Free: 10 tasks, 5 posts, 3 emails
- Pro: 100 tasks, 50 posts, 25 emails
- Enterprise: 1000 tasks, 500 posts, 250 emails

---

## Deployment Architecture

### Production Setup (Railway + Vercel)

```
┌─────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE / DNS                      │
│                    yourplatform.com                          │
└────────────────────┬───────────────┬────────────────────────┘
                     │               │
                     ▼               ▼
         ┌───────────────────┐  ┌──────────────────┐
         │   VERCEL (CDN)    │  │  RAILWAY (VPS)   │
         │   Frontend App    │  │  Backend API     │
         │   Next.js SSR     │  │  Express Server  │
         └───────────────────┘  └──────────────────┘
                     │                     │
                     │                     │
                     │                     ▼
                     │          ┌──────────────────────┐
                     │          │  SUPABASE POSTGRES   │
                     │          │  25 Tables + Indexes │
                     │          └──────────────────────┘
                     │
                     ▼
         ┌─────────────────────────────────────────┐
         │       EXTERNAL APIs                     │
         │  OpenAI | Stripe | LinkedIn | Azure    │
         └─────────────────────────────────────────┘
```

**Hosting Costs** (~$10-115/month):
- Vercel: $0-20 (free tier usually enough)
- Railway: $5-20 (Hobby to Pro)
- Supabase: $0-25 (free tier: 500MB)
- OpenAI: $5-50 (usage-based)
- Stripe: 2.9% + $0.30 per transaction

---

## Scaling Strategy

### Horizontal Scaling

```
Frontend (Vercel):
    - Auto-scales globally
    - Edge caching
    - No config needed

Backend (Railway):
    - Add more instances (Pro plan)
    - Load balancer (auto)
    - Session-less (JWT in request)

Database (Supabase):
    - Connection pooling (PgBouncer)
    - Read replicas (Pro plan)
    - Vertical scaling

Background Workers:
    - Move to BullMQ (Redis-based queue)
    - Multiple worker instances
    - Job priority & retries
```

### Caching Strategy

```
Current: None (stateless)

Future:
    Redis Cache
        ├─ User sessions (if moving from JWT)
        ├─ AI responses (dedup similar queries)
        ├─ Analytics metrics (hourly cache)
        └─ Rate limiting counters

    CDN Cache (Vercel)
        ├─ Static assets (images, CSS, JS)
        └─ ISR pages (dashboard with 60s revalidation)
```

---

## Security Layers

### 1. Network Layer
- HTTPS only (enforced by Railway/Vercel)
- CORS whitelist (FRONTEND_URL)
- Rate limiting (future: Redis-based)

### 2. Authentication Layer
- JWT tokens (signed with secret)
- Token expiry (configurable)
- Secure password hashing (bcrypt)

### 3. Authorization Layer
- RBAC (owner/admin/member)
- Organization isolation (all queries filtered by orgId)
- Resource ownership checks

### 4. Data Layer
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (React auto-escapes)
- Webhook signature verification (Stripe)

### 5. Application Layer
- Usage limits (prevent abuse)
- Input validation (required fields)
- Error handling (no sensitive info in errors)

---

## Monitoring & Observability

### Logs
```
Backend:
    console.log() → Railway Logs
    - Request logs
    - Error logs
    - Agentic actions
    - Task execution

Frontend:
    console.error() → Vercel Function Logs
    - API errors
    - React errors
```

### Metrics (Future)
```
Performance:
    - API response times
    - Database query times
    - OpenAI API latency
    - Task execution duration

Business:
    - Active users
    - Tasks created/completed
    - AI chat messages
    - Conversion rates
    - Revenue (Stripe)
```

### Health Checks
```
GET /api/health
    ↓
    Check database connection
    Check OpenAI API key
    Check Stripe API key
    ↓
    Return: { status: 'healthy', services: {...} }
```

---

## Development Workflow

```
Local Development:
    ┌──────────────────────────────────┐
    │  Terminal 1: Backend (port 5000) │
    │  npm run dev                     │
    └──────────────────────────────────┘
    ┌──────────────────────────────────┐
    │  Terminal 2: Frontend (port 3000)│
    │  npm run dev                     │
    └──────────────────────────────────┘
    ┌──────────────────────────────────┐
    │  Database: Supabase (cloud)      │
    │  Or local PostgreSQL             │
    └──────────────────────────────────┘

Staging:
    ┌──────────────────────────────────┐
    │  Railway: staging branch         │
    │  Vercel: staging preview         │
    └──────────────────────────────────┘

Production:
    ┌──────────────────────────────────┐
    │  Railway: main branch            │
    │  Vercel: main branch             │
    └──────────────────────────────────┘
```

### Git Workflow
```
main (production)
    ↓
develop (staging)
    ↓
feature/new-feature (local)
    ↓
PR → develop → test → merge
    ↓
PR → main → deploy
```

---

## Future Architecture (Phase 3+)

### Event-Driven Architecture

```
┌────────────────────────────────────────┐
│         Event Bus (Redis Pub/Sub)      │
└─────┬──────────────────────────────┬───┘
      │                              │
      ▼                              ▼
┌──────────────┐           ┌──────────────┐
│ Background   │           │  WebSocket   │
│  Workers     │           │   Server     │
│  (BullMQ)    │           │ (Socket.io)  │
└──────────────┘           └──────────────┘
      │                              │
      ▼                              ▼
   Execute                      Notify
   Tasks                        Frontend
```

### Microservices (Optional)

```
API Gateway
    ├─ Auth Service (JWT, OAuth)
    ├─ AI Service (OpenAI, models)
    ├─ CRM Service (leads, activities)
    ├─ Content Service (posts, calendar)
    ├─ Payment Service (Stripe)
    └─ Analytics Service (metrics, reports)
```

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 | React framework, SSR |
| Styling | Tailwind CSS | Utility-first CSS |
| Animations | Framer Motion | Smooth transitions |
| Charts | Recharts | Data visualization |
| Backend | Express.js | REST API server |
| Database | PostgreSQL | Relational data |
| ORM | Prisma | Type-safe queries |
| Auth | JWT | Stateless tokens |
| AI | OpenAI GPT-4 | Chat, content gen |
| Payments | Stripe | Subscriptions |
| Social | LinkedIn API | Post publishing |
| Hosting | Railway + Vercel | Backend + Frontend |
| CI/CD | GitHub + Auto-deploy | Continuous delivery |

---

**Architecture designed for**:
- ✅ Scalability (1000s of users)
- ✅ Maintainability (modular services)
- ✅ Security (multi-layer defense)
- ✅ Cost-efficiency ($10-115/month)
- ✅ Developer experience (TypeScript, hot reload)



