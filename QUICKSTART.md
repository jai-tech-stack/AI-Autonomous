# 🚀 Quick Start Guide (5 Minutes)

Get the AI CEO Platform running locally in 5 minutes.

---

## Step 1: Install Dependencies (2 min)

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

---

## Step 2: Setup Environment (1 min)

### Backend `.env`
Create `backend/.env`:

```env
# Minimum required to run
DATABASE_URL=postgresql://user:password@host:5432/database?pgbouncer=true
JWT_SECRET=change-this-to-a-long-random-string-min-32-chars
OPENAI_API_KEY=sk-proj-your-key-here

# Optional (for full features)
STRIPE_SECRET_KEY=sk_test_your-key
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
PORT=5000
NODE_ENV=development
```

### Frontend `.env.local`
Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Step 3: Setup Database (1 min)

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed demo data (optional)
npx ts-node prisma/seed.ts
```

---

## Step 4: Run Servers (1 min)

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```
✅ Backend running on http://localhost:5000

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
✅ Frontend running on http://localhost:3000

---

## Step 5: Test (30 sec)

1. Open http://localhost:3000
2. Click **Register**
3. Create account
4. Create organization
5. Go to **Chat** → Send message to AI CEO
6. ✅ Should get GPT-4 response (if OPENAI_API_KEY is set)

---

## Troubleshooting

### "OPENAI_API_KEY is not set"
- Get key from https://platform.openai.com/api-keys
- Add to `backend/.env`
- Restart backend server

### "Database connection failed"
- Check `DATABASE_URL` in `backend/.env`
- For Supabase: Use "Connection Pooling" URL
- Test: `cd backend && npx prisma db pull`

### "Cannot connect to backend"
- Ensure backend is running on port 5000
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- CORS is already configured for localhost:3000

### "Module not found"
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## What's Working Now

✅ **User Registration & Login**  
✅ **AI Chat** (with real GPT-4 if key provided)  
✅ **Task Creation** (autonomous executor runs every 60s)  
✅ **CRM** (leads, activities, meetings)  
✅ **Analytics Dashboard**  
✅ **Content Calendar**  
✅ **Usage Limits** (Free: 10 tasks/mo)  
✅ **Agentic Engine** (runs every hour for Pro/Enterprise)  

---

## Next Steps

1. **Get OpenAI API Key** (required for real AI):
   - https://platform.openai.com/api-keys
   - Add $5 credit to start
   
2. **Setup Stripe** (optional, for payments):
   - https://dashboard.stripe.com
   - Get test keys
   - Create products & prices

3. **Deploy to Production**:
   - See `DEPLOYMENT.md` for Railway + Vercel guide
   - Should take ~30 minutes

4. **Add Advanced Features**:
   - D-ID avatar videos
   - Whisper voice commands
   - DALL-E image generation
   - Real TensorFlow.js ML

---

## Quick Commands Reference

```bash
# Start development
npm run dev

# Database commands
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Create new migration
npx prisma migrate deploy  # Apply migrations
npx prisma studio          # View database GUI
npx ts-node prisma/seed.ts # Seed demo data

# Build for production
npm run build
npm run start

# Tests
npm test
```

---

## Default Demo Account (After Seeding)

```
Email: owner@example.com
Password: (as set in seed.ts - default is hashed, change it)
Organization: Demo Org
Plan: Free
```

**Note**: Change password in production!

---

## Environment Checklist

Before deploying:

- [ ] `OPENAI_API_KEY` added
- [ ] `JWT_SECRET` is random & secure (32+ chars)
- [ ] `DATABASE_URL` connects successfully
- [ ] Backend starts without errors
- [ ] Frontend connects to backend
- [ ] Chat with AI CEO works
- [ ] Task creation works
- [ ] Analytics load

---

## Performance Tips

- **Database**: Use connection pooling (add `?pgbouncer=true`)
- **OpenAI**: Use `gpt-4o-mini` for faster/cheaper responses
- **Frontend**: Build with `npm run build` for production
- **Caching**: Add Redis (optional, for scale)

---

## Cost for Testing

- **Database**: Supabase free tier (500 MB)
- **OpenAI**: ~$0.50 for 100 chats (gpt-4o-mini)
- **Hosting**: Railway/Vercel free tiers for development
- **Total**: ~$1-5 for first month of testing

---

## Common First Tasks

### 1. Chat with AI CEO
- Dashboard → Chat
- Send: "What should I focus on today?"
- Get GPT-4 strategic advice

### 2. Create Autonomous Task
- Dashboard → Tasks → New Task
- Type: social_media_post
- Waits for executor (runs every 60s)
- Check output

### 3. Add Lead to CRM
- Dashboard → CRM → Add Lead
- Fill details
- View in lead list

### 4. View Analytics
- Dashboard → Analytics
- See revenue, tasks, conversion metrics

### 5. Test Agentic Engine
```bash
# Trigger manually
curl -X POST http://localhost:5000/api/agentic/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "your-org-id"}'
```

---

**You're all set! 🎉**

For full deployment to production, see `DEPLOYMENT.md`.



