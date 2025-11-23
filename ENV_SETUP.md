# 🔧 ENVIRONMENT VARIABLES SETUP

This file documents all environment variables required for StressTest FISICA.

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your API keys** (see instructions below)

3. **Never commit `.env` to git** (already in .gitignore)

---

## Required Variables

### Backend (Server)

#### `DEEPSEEK_API_KEY`
- **Required for:** AI-powered exam generation
- **Get it at:** https://platform.deepseek.com/api-keys
- **Format:** `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Example:** `DEEPSEEK_API_KEY=sk-abc123def456`

#### `STRIPE_SECRET_KEY`
- **Required for:** Payment processing
- **Get it at:** https://dashboard.stripe.com/test/apikeys (test) or /apikeys (live)
- **Format:** `sk_test_xxx` (test) or `sk_live_xxx` (production)
- **Example:** `STRIPE_SECRET_KEY=sk_test_51Abc...`
- **⚠️ CRITICAL:** NEVER expose this key in frontend code!

#### `CLIENT_URL`
- **Required for:** CORS (Cross-Origin Resource Sharing)
- **Development:** `http://localhost:5173`
- **Production:** Your Vercel deployment URL (e.g., `https://stresstest.vercel.app`)
- **Example:** `CLIENT_URL=http://localhost:5173`

---

### Frontend (Vite)

#### `VITE_API_URL`
- **Required for:** API endpoint configuration
- **Development:** `http://localhost:3000`
- **Production:** Your Render backend URL (e.g., `https://stresstest-api.onrender.com`)
- **Example:** `VITE_API_URL=http://localhost:3000`

#### `VITE_STRIPE_PUBLISHABLE_KEY`
- **Required for:** Stripe payment UI
- **Get it at:** https://dashboard.stripe.com/test/apikeys
- **Format:** `pk_test_xxx` (test) or `pk_live_xxx` (production)
- **Example:** `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Abc...`
- **✅ SAFE:** This key CAN be exposed in frontend code

---

## Development Setup

Create a `.env` file in the **root directory**:

```env
# Backend
DEEPSEEK_API_KEY=sk-your-key-here
STRIPE_SECRET_KEY=sk_test_your-key-here
CLIENT_URL=http://localhost:5173

# Frontend (Vite)
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
```

Then start both servers:
```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend
npm run dev
```

---

## Production Deployment

### Render (Backend)

In your Render service dashboard, add environment variables:

```
DEEPSEEK_API_KEY = sk-your-production-key
STRIPE_SECRET_KEY = sk_live_your-production-key
CLIENT_URL = https://your-app.vercel.app
```

**Important:**
- Use **production keys** for Stripe and DeepSeek
- `CLIENT_URL` must match your exact Vercel domain (no trailing slash)
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`

### Vercel (Frontend)

In your Vercel project settings → Environment Variables:

```
VITE_STRIPE_PUBLISHABLE_KEY = pk_live_your-production-key
```

**Important:**
- Update `vercel.json` with your Render backend URL
- Use Stripe **live** keys for production
- Vercel auto-detects Vite and builds correctly

---

## Security Checklist

- [ ] `.env` is in `.gitignore` (✅ already configured)
- [ ] Never commit API keys to git
- [ ] Use test keys for development
- [ ] Use live keys only in production
- [ ] `STRIPE_SECRET_KEY` is ONLY on backend
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` is safe to expose
- [ ] `CLIENT_URL` matches your frontend domain exactly

---

## Troubleshooting

### "CORS Error"
- Check that `CLIENT_URL` on backend matches your frontend URL exactly
- No trailing slash in `CLIENT_URL`
- Restart backend after changing `CLIENT_URL`

### "Payment not working"
- Verify `STRIPE_SECRET_KEY` is set on backend
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set on frontend
- Check both keys are from the same Stripe account
- Test keys start with `sk_test_` and `pk_test_`

### "Exam generation fails"
- Verify `DEEPSEEK_API_KEY` is valid
- Check API quota at https://platform.deepseek.com
- Review backend logs for specific error messages

---

## API Key Resources

- **DeepSeek:** https://platform.deepseek.com/api-keys
- **Stripe Test Keys:** https://dashboard.stripe.com/test/apikeys
- **Stripe Live Keys:** https://dashboard.stripe.com/apikeys (requires verification)

---

**Last Updated:** 2025-11-23
