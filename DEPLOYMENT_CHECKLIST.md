# 🚀 Checklist Deployment - StressTest FISICA

## ✅ Pre-Deployment (Da Verificare)

### Backend (Render)
- [ ] **Variabili d'Ambiente**: Verifica che siano impostate su Render Dashboard
  - `STRIPE_SECRET_KEY` (live key, non test)
  - `STRIPE_WEBHOOK_SECRET` (webhook secret per produzione)
  - `DEEPSEEK_API_KEY`
  - `CLIENT_URL=https://stresstest-fisica.vercel.app`
  - `NODE_ENV=production` (opzionale, ma consigliato)

- [ ] **Persistent Disk**: Verifica che il disco sia montato su `/opt/render/project/src/server/data`

- [ ] **Webhook Stripe**: Configura webhook su Stripe Dashboard
  - URL: `https://stresstest-pvuf.onrender.com/webhook`
  - Eventi: `payment_intent.succeeded`

### Frontend (Vercel)
- [ ] **Variabili d'Ambiente**: Verifica su Vercel Dashboard
  - `VITE_API_URL` (opzionale se usi proxy in `vercel.json`)
  - `VITE_STRIPE_PUBLISHABLE_KEY` (live key)

- [ ] **Proxy API**: Verifica che `vercel.json` punti all'URL corretto del backend Render

## ✅ Build e Test Locale

- [x] **Frontend Build**: `npm run build` completato senza errori
- [x] **Backend Test**: Server avviato e risponde su `/health`
- [x] **Mobile UI**: Testato su iPhone SE (375px) - nessuna sovrapposizione
- [x] **PaymentModal**: Responsive e funzionale
- [x] **AI Prompt**: Aggiornato per difficoltà maggiore e LaTeX corretto

## ✅ Security Check

- [x] **CORS**: Configurato con warning se `CLIENT_URL` non è impostato
- [x] **Rate Limiting**: Attivo (5 exams/hour, 100 req/15min)
- [x] **Helmet**: Middleware di sicurezza attivo
- [x] **Webhook Verification**: Stripe webhook signature verification implementata
- [x] **Env Vars**: Nessuna chiave hardcoded nel codice

## ✅ Deployment Steps

### 1. Backend (Render)
```bash
# Render farà automaticamente:
# 1. git clone del tuo repo
# 2. npm install && npm run build && cd server && npm install
# 3. cd server && node index.js
```

**Verifica dopo deploy**:
```bash
curl https://stresstest-pvuf.onrender.com/health
# Dovrebbe restituire: {"status":"healthy","cache":N,"tokens":M}
```

### 2. Frontend (Vercel)
```bash
# Push su main branch
git add .
git commit -m "Ready for production deployment"
git push origin main

# Vercel farà automaticamente il deploy
```

**Verifica dopo deploy**:
- Visita `https://stresstest-fisica.vercel.app`
- Testa il flow completo: Home → Seleziona topic → INITIATE_SEQUENCE → Pagamento → Esame

## ✅ Post-Deployment Verification

- [ ] **Health Check**: Backend risponde su `/health`
- [ ] **Frontend Load**: Homepage si carica correttamente
- [ ] **API Proxy**: Chiamate API da Vercel raggiungono Render
- [ ] **Payment Flow**: Test payment (usa Stripe test mode prima di andare live!)
  - Card test: `4242 4242 4242 4242`, CVV: `123`, Data: futura
- [ ] **Exam Generation**: Genera un esame e verifica la qualità
- [ ] **PDF Export**: Scarica PDF e verifica la formattazione

## ⚠️ IMPORTANTE - Prima di Andare Live

1. **Stripe Test Mode**: 
   - Usa prima le chiavi TEST di Stripe
   - Testa tutto il flow di pagamento
   - Verifica che il webhook funzioni
   
2. **Stripe Live Mode**:
   - Solo quando sei sicuro che tutto funziona
   - Sostituisci le chiavi TEST con le chiavi LIVE
   - Aggiorna il webhook URL su Stripe Dashboard

3. **Monitoring**:
   - Controlla i log su Render Dashboard
   - Monitora gli errori
   - Verifica i pagamenti su Stripe Dashboard

## 🎯 Quick Deploy Commands

```bash
# Commit finale
git add .
git commit -m "Production ready: AI improvements, mobile fixes, security enhancements"
git push origin main

# Vercel deployerà automaticamente
# Render deploierà automaticamente (se hai configurato auto-deploy da GitHub)
```

## 📊 Post-Deploy Monitoring

- Render Dashboard: https://dashboard.render.com
- Vercel Dashboard: https://vercel.com/dashboard
- Stripe Dashboard: https://dashboard.stripe.com

---

**Status**: ✅ PRONTO PER IL DEPLOYMENT

Ultimo aggiornamento: 2025-11-24 13:12
