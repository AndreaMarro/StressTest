# 🏥 PROJECT MASTER PLAN: StressTest FISICA

**Ultimo Aggiornamento**: 2025-11-25
**Versione Attuale**: v2.1 (Auth System + Unique Guarantee)

---

## 1. 🎯 VISIONE & OBIETTIVI

### Missione
Creare la **più brutale e onesta simulazione** per il test di ammissione a Medicina ("Semestre Filtro"). L'app non deve coccolare lo studente, ma prepararlo alla durezza del percorso accademico.

### Il Personaggio: "Il Primario"
L'intera UX è guidata da una persona AI:
- **Tono**: Cinico, sarcastico, tecnicamente ineccepibile.
- **Filosofia**: "L'ignoranza uccide. Meglio piangere ora che in corsia."
- **Regola d'Oro**: Mai complimenti gratuiti. Solo "Forse non ucciderai nessuno oggi".

### Core Value Proposition
- **Esami Unici**: Mai la stessa domanda due volte (garantito da tracking storico).
- **Spiegazioni Dettagliate**: Step-by-step matematici rigorosi (LaTeX).
- **Accesso a Tempo**: 45 minuti per simulare la pressione reale.
- **Costo Micro**: €0.50 per esame (accessibile ma disincentiva lo spreco).

---

## 2. ✅ STATO ATTUALE DEL PROGETTO (v2.1)

### Funzionalità Chiave Implementate

#### 🧠 Generazione Esami (AI Core)
- **Engine**: DeepSeek API (`deepseek-reasoner`).
- **Logica**: Cache-first con lazy generation.
- **Struttura**: 31 domande (15 Multiple Choice, 16 Fill-in) su syllabus DM418.
- **Robustezza**: Parser JSON a 3 stadi con auto-repair per LaTeX e caratteri escape.

#### 💳 Sistema di Pagamento & Accesso
- **Provider**: Stripe (Test & Live Mode).
- **Modello**: Pay-per-use (€0.49/esame).
- **Accesso**: Token sessione valido 45 minuti.
- **Cross-Device**: Magic Link via URL + Account System.

#### 🔐 Autenticazione & Persistenza (v2.1)
- **Sistema**: Nickname + Password (Hashed).
- **Obiettivo**: Garantire la "Unique Exam Guarantee" su più dispositivi.
- **Funzionamento**:
  - Registrazione salva `userId` corrente.
  - Login ripristina `userId` e storico acquisti.
  - Sincronizzazione immediata dello stato.

#### 📄 Export & Reporting
- **PDF Export**: Layout professionale, branding "StressTest", sanitizzazione caratteri.
- **Bug Reporting**: Floating button, rate-limited, salvataggio su JSON backend.

---

## 3. 🏗️ ARCHITETTURA TECNICA

### Frontend (`/src`)
- **Framework**: React 19 (Vite).
- **Linguaggio**: TypeScript.
- **Styling**: Tailwind CSS (Neo-Brutalist Theme: `#00ff00`, Black, Thick Borders).
- **State**: `useState` + Custom Hooks (`useSession`, `usePayment`). NO Redux.

### Backend (`/server`)
- **Runtime**: Node.js + Express.
- **Database**: File-based JSON System (in `/server/data/`).
  - `users.json`: Auth credentials.
  - `user_history.json`: Tracking esami visti.
  - `exam_cache.json`: Cache domande.
  - `bug_reports.json`: Segnalazioni utenti.
- **Security**: Helmet, CORS, Rate Limiting, Input Validation (Zod).

### Infrastruttura
- **Frontend Deploy**: Vercel.
- **Backend Deploy**: Render.
- **Environment**: `.env` gestito manualmente su dashboard.

---

## 4. 🔮 ROADMAP & INTENTI FUTURI

### 🚀 Breve Termine (Ottimizzazione)
- [ ] **Mobile UX Refinement**: Assicurare touch targets > 44px ovunque.
- [ ] **Analytics**: Tracciare completamento esami e score medio (anonimo).
- [ ] **Performance**: Code splitting per ridurre bundle size iniziale.

### 🛠️ Medio Termine (Struttura)
- [ ] **Database Migration**: Passare da JSON files a SQLite/PostgreSQL per scalabilità e sicurezza concorrente.
- [ ] **Admin Dashboard**: Interfaccia per visualizzare bug reports e gestire promo code.

### 🌟 Lungo Termine (Espansione)
- [ ] **Spaced Repetition**: Suggerire ripassi basati sugli errori passati.
- [ ] **Social Features**: Classifiche anonime ("Il Muro del Pianto").
- [ ] **PWA**: Supporto offline per review esami passati.

---

## 5. ⚠️ NOTE DI MANUTENZIONE

### Comandi Utili
- **Dev**: `npm run dev` (Frontend), `node server/index.js` (Backend).
- **Build**: `npm run build`.
- **Test API**: `curl` scripts in `FUTURE_DEV_PROMPT.md`.

### Problemi Noti & Fix
- **Stripe Webhook**: Se fallisce, il client fa polling su `/api/poll-payment-status`.
- **JSON Crash**: Se DeepSeek impazzisce, il parser tenta il fix. Se fallisce, errore gestito lato client.
- **Cache Browser**: Se l'utente non vede aggiornamenti, consigliare `Cmd+Shift+R`.

---

> *"Il codice è come l'anatomia: se sbagli un taglio, il paziente muore. Non sbagliare."* - Il Primario
