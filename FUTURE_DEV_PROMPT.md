# StressTest FISICA - Future Development Prompt

**Ultimo Aggiornamento**: 2025-11-25  
**Versione Deploy**: v2.0 (con AI enhancements + bug reporting)

---

## 🎯 MISSIONE DEL PROGETTO

**StressTest FISICA** è una web app per preparazione al test di medicina (Semestre Filtro). L'app deve essere:
- ✅ **Tecnicamente impeccabile** (robusta, performante, sicura)
- ✅ **Personaggio unico** - "Il Primario": cinico, sarcastico, brutalmente onesto

### Personaggio: "Il Primario"

**NON è un assistente gentile**. È un Primario di Medicina di vecchia scuola.

**Regole di Tono** (CRITICHE):
- **Sarcasmo Tagliente**: "Se curassi i pazienti come risolvi le equazioni, avremmo le celle frigorifere piene"
- **Umiliazione Costruttiva**: Evidenzia ignoranza su concetti base come peccato mortale
- **Nessuna Pietà**: NO frasi gentili ("Bravo, continua così")
- **Unico complimento ammesso**: "Forse non ucciderai nessuno oggi"
- **Competenza Assoluta**: Spiegazioni tecnicamente perfette, rigorose, LaTeX corretto

---

## 📦 STACK TECNOLOGICO

| Componente | Tecnologia | Note |
|------------|------------|------|
| **Frontend** | React (Vite), TypeScript | SPA con persistenza localStorage |
| **Styling** | Tailwind CSS, Framer Motion | Neo-Brutalist design |
| **Backend** | Node.js, Express | API + cache esami |
| **AI** | DeepSeek API (`deepseek-reasoner`) | Generazione esami |
| **Payments** | Stripe (Test/Live mode) | €0.50 per esame |
| **Deploy** | Vercel (FE) + Render (BE) | Auto-deploy da `main` |

---

## ✅ STATO ATTUALE (v2.0)

### Funzionalità Implementate

1. **Sistema Generazione Esami**
   - ✅ Cache-first strategy (evita chiamate AI ridondanti)
   - ✅ Quiz uniqueness: utente non riceve mai stesso esame (`excludeIds`)
   - ✅ Auto-seeding cache ogni 5 minuti
   - ✅ 31 domande per esame (15 multiple choice, 16 fill-in)

2. **AI Enhancements (v2.0)**
   - ✅ **JSON Parser Robusto**: 3-stage repair con LaTeX auto-fixes
   - ✅ **Spiegazioni Ultra-Dettagliate**: 15-25 righe, step-by-step matematici
   - ✅ **Sarcasmo Variato**: 12 template pre-scritti (no ripetizioni)
   - ✅ Auto-fix: `\cdotp` → `\cdot`, spacing in `\text{}`

3. **Bug Reporting System (NEW v2.0)**
   - ✅ Floating FAB (solo durante esame)
   - ✅ Backend `/api/report-bug` con rate limiting (10/15min)
   - ✅ Storage JSON: `server/data/bug_reports.json`

4. **Sistema Pagamenti**
   - ✅ Stripe con webhook + polling (fix iPhone)
   - ✅ Session token (UUID) indipendente da IP
   - ✅ 45 minuti di accesso post-pagamento
   - ✅ Magic link cross-device

5. **Persistenza & UX**
   - ✅ Auto-save risposte durante esame
   - ✅ Session restore (con timeout 45min)
   - ✅ Restart pulisce localStorage correttamente
   - ✅ PDF export professionale con branding

6. **Sicurezza & Performance**
   - ✅ Rate limiting su tutti gli endpoint critici
   - ✅ Helmet.js security headers
   - ✅ CORS configurato per produzione
   - ✅ Input validation con Zod

---

## ⚠️ PROBLEMI NOTI & SOLUZIONI

### 1. **Browser Cache (COMUNE POST-DEPLOY)**

**Sintomo**: Modifiche pushate ma pulsanti/features non funzionano  
**Causa**: Browser usa vecchia versione in cache  
**Soluzione**: 
- Utente: `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Win)
- Dev: Increment version in `package.json` per cache bust

### 2. **Stripe Webhook Mancato**

**Sintomo**: Payment succeeds ma accesso non granted  
**Causa**: Webhook non raggiunge server o IP mismatch  
**Soluzione**: 
- Polling fallback già implementato (`/api/poll-payment-status`)
- Verify endpoint in `/api/verify-payment` crea token se manca

### 3. **JSON Parse Errors da DeepSeek**

**Sintomo**: Server crash con `Bad escaped character`  
**Status**: ✅ RISOLTO in v2.0  
**Soluzione implementata**: Parser a 3 stage con LaTeX escape repair

### 4. **localStorage Persistence Loop**

**Sintomo**: App riapre sempre ultimo esame  
**Status**: ✅ RISOLTO in v2.0  
**Soluzione**: `onRestart` pulisce `stressTestSession` e `stressTestStartTime`

---

## 🏗️ ARCHITETTURA & CONVENZIONI

### File Structure

```
stresstest/
├── src/                    # Frontend React
│   ├── components/
│   │   ├── ui/            # Reusable components (NeoButton, BugReportButton)
│   │   ├── views/         # Page views (ExamView, ResultsView, StartScreen)
│   │   └── layout/        # Layout wrappers (TerminalLayout)
│   ├── hooks/             # Custom hooks (useExamState, usePayment)
│   ├── utils/             # Utilities (pdfExport.ts)
│   └── types/             # TypeScript types
├── server/
│   ├── index.js           # Express server (787 lines)
│   ├── services/
│   │   └── examGenerator.js  # DeepSeek AI integration
│   └── data/              # JSON storage (gitignored)
│       ├── exam_cache.json
│       ├── access_tokens.json
│       ├── bug_reports.json
│       └── promo_codes.json
└── public/
```

### Naming Conventions

- **Components**: PascalCase (e.g., `BugReportButton.tsx`)
- **Hooks**: camelCase prefixed `use` (e.g., `useExamState.ts`)
- **Utils**: camelCase (e.g., `pdfExport.ts`)
- **API Routes**: kebab-case `/api/report-bug`

### State Management

**NO Redux/Zustand** - Usiamo:
- `useState` + `useEffect` in `App.tsx`
- Custom hooks per logica compartimentalizzata
- `localStorage` per persistenza client-side

### CSS Philosophy

- **Tailwind Utility-First**: Usa classi Tailwind direttamente
- **Neo-Brutalist Theme**: 
  - Bordi spessi (`border-4`)
  - Colori flat (terminal green `#00ff00`, black, yellow)
  - Animazioni discrete (hover scale, pulse)

---

## 🔐 ENVIRONMENT VARIABLES

### Backend (Render)

```bash
DEEPSEEK_API_KEY=sk-...           # DeepSeek API
STRIPE_SECRET_KEY=sk_live_... o sk_test_...  # Stripe
CLIENT_URL=https://stresstest.vercel.app      # CORS
STRIPE_WEBHOOK_SECRET=whsec_...   # Webhook signature
```

### Frontend (Vercel)

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... o pk_test_...
VITE_API_URL=https://stresstest-backend.onrender.com  # Non usato (usa proxy)
```

**NOTA CRITICA**: `.env` è gitignored. Aggiorna **manualmente** in dashboard Render/Vercel ad ogni cambio chiavi.

---

## 🧪 TESTING PROTOCOL (PRE-DEPLOY)

### Checklist Obbligatoria

**Local Tests** (prima del push):

```bash
# 1. Build check
npm run build
# → NO errors, bundle size reasonable (<1MB per chunk)

# 2. Server start
cd server && node index.js
# → ✅ Environment validated
# → ✅ Server running on port 3000

# 3. Generate exam test
curl -X POST http://localhost:3000/api/generate-exam \
  -H "Content-Type: application/json" \
  -d '{"topic":"Meccanica","difficulty":"medium","excludeIds":[]}'
# → Returns 31 questions JSON
# → Check explanations are 15+ lines
# → NO JSON parse errors in logs
```

**Manual UI Tests**:

1. **Flow Esame Gratuito**:
   - Seleziona topic → genera esame → rispondi → termina → vedi risultati
   - ✅ Timer funziona
   - ✅ Risposte salvate
   - ✅ Punteggio corretto

2. **Flow Pagamento** (Stripe Test Mode):
   - Card: `4242 4242 4242 4242`, exp: futuro, CVC: 123
   - ✅ Payment modal appare
   - ✅ Dopo success, esame caricato
   - ✅ Magic link generato

3. **Bug Reporting**:
   - Durante esame: click FAB giallo → segnala bug
   - ✅ Modal si apre
   - ✅ Submit funziona
   - ✅ File `server/data/bug_reports.json` aggiornato

4. **PDF Export**:
   - Completa esame → Results → "SALVA PDF"
   - ✅ PDF scaricato
   - ✅ Branding presente
   - ✅ LaTeX convertito correttamente

5. **Restart Button**:
   - Results → "NUOVO TEST"
   - ✅ Torna a start screen
   - ✅ NO loop (non ricarica risultati)

**Mobile Safari** (iPhone):
- ✅ Input non zooma (font-size ≥16px)
- ✅ Viewport corretto (no address bar overlap)
- ✅ Touch targets ≥44px

---

## 🚨 ERRORI COMUNI & DEBUG

### "Module 'zod' not found"
**Fix**: `cd server && npm install zod`

### "CORS error" in produzione
**Fix**: Verifica `CLIENT_URL` in Render dashboard = Vercel URL

### "Stripe key invalid"
**Fix**: Controlla che chiavi in dashboard siano **Test** o **Live** consistenti

### AI genera JSON malformato
**Check logs**: `[JSON Parser] ❌ All repair attempts failed`  
**Fix**: Parser dovrebbe gestire, ma verifica prompt non sia stato modificato

### PDF non scarica
**Browser console**: Cerca errori jsPDF  
**Fix**: Potrebbe essere browser security policy. Prova altro browser.

---

## 📋 DEVELOPMENT WORKFLOW

### Per Nuove Feature

1. **Planning**:
   - Crea `implementation_plan.md` in artifacts
   - Request user review PRIMA di codare

2. **Coding**:
   - Lavora su branch feature (opzionale) o diretto su `main`
   - Test localmente SEMPRE prima del push
   - Commit messages chiari: `feat:`, `fix:`, `refactor:`

3. **Deploy**:
   - Push a `main` → Auto-deploy Vercel + Render
   - Monitora logs deploy
   - Test su URL production PRIMA di confermare all'utente

4. **Post-Deploy**:
   - Crea `walkthrough.md` con recap
   - Aggiorna questo documento se architettura cambiata

### Git Workflow

```bash
# Feature development
git checkout -b feature/nome-feature  # Opzionale
# ... codifica ...
git add .
git commit -m "feat: descrizione chiara"
git push origin main  # O merge via PR

# Hotfix
git add file.js
git commit -m "fix: descrizione del bug risolto"
git push origin main
```

---

## 🎓 BEST PRACTICES

### LaTeX in AI Responses

**SEMPRE**:
- Usa `$...$` per inline, `$$...$$` per display
- Unità: `\text{ m/s}` (con spazio interno)
- Moltiplicazione: `\cdot` (NO `\cdotp`)
- Frazioni: `\frac{num}{den}`

### Error Messages

**TUTTI** i messaggi di errore devono essere in-character (Primario):
```javascript
// ❌ SBAGLIATO
res.status(400).json({ error: 'Invalid input' });

// ✅ CORRETTO
res.status(400).json({ 
  error: 'Input malformato. Torna sui libri prima di usare questa applicazione.' 
});
```

### Rate Limiting

Default: `100 req/15min` per IP  
AI endpoints: `5 req/hour`  
Promo: `5 req/min`  
Bug reports: `10 req/15min`

**Modifica** con cautela: troppo restrittivo blocca utenti legittimi, troppo lasco apre a abuse.

---

## 🔮 ROADMAP FUTURO (Opzionale)

### Alta Priorità
- [ ] **Analytics**: Track exam completions, avg scores (privacy-compliant)
- [ ] **Admin Dashboard**: Review bug reports, manage promo codes
- [ ] **Spaced Repetition**: Suggerire review di argomenti deboli

### Media Priorità
- [ ] **Refactor App.tsx**: Estrarre logica in hooks (600+ righe attuali)
- [ ] **Mobile UX**: Aumentare touch targets, aggiungere `dvh` units
- [ ] **Database Migration**: SQLite o PostgreSQL invece di JSON files

### Bassa Priorità
- [ ] **PWA**: Offline support per esami cached
- [ ] **Social Features**: Leaderboard, sfide tra studenti
- [ ] **Gamification**: Badges, streak di studio

---

## 🛠️ TROUBLESHOOTING RAPIDO

| Sintomo | Causa Probabile | Fix |
|---------|-----------------|-----|
| Pulsanti non funzionano | Browser cache | Hard refresh `Cmd+Shift+R` |
| Deploy fail | Dependency mancante | Check `package.json`, run `npm install` |
| AI timeout | DeepSeek overload | Retry o aumenta timeout in `examGenerator.js` |
| Payment non verifica | Webhook KO | Polling fallback attivo, check logs |
| PDF vuoto | jsPDF error | Console browser, verifica LaTeX conversion |

---

## 📞 CONTATTI & RISORSE

- **Repo GitHub**: `AndreaMarro/StressTest`
- **Deploy Frontend**: Vercel dashboard
- **Deploy Backend**: Render dashboard
- **Stripe**: Dashboard → Test mode vs Live mode
- **DeepSeek**: [platform.deepseek.com](https://platform.deepseek.com)

---

## 🎯 REMEMBER: "Il Primario"

> *"Vedi di non deludermi, specializzando. Il codice deve compilare, o ti mando a pulire le padelle."*

Ogni nuova feature, messaggio di errore, o UI copy DEVE riflettere il personaggio. Zero gentilezze, massima competenza tecnica, sarcasmo chirurgico.

**Buon lavoro!** 💉🩺
