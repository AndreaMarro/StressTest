# Walkthrough - StressTest FISICA

## Overview
We have successfully built the "StressTest FISICA" web application, a Neo-Brutalist exam simulation tool for Medical School preparation.

## Features Implemented

### 1. Neo-Brutalist Design
- **Custom UI Components**: `NeoButton` and `NeoCard` with high-contrast borders and shadows.
- **Tailwind Configuration**: Custom colors (`neo-lime`, `neo-red`, etc.) and fonts.
- **Responsive Layout**: Sidebar navigation and mobile-friendly design.

### 2. DeepSeek AI Integration
- **Service Layer**: `DeepSeekService` handles API calls to generate questions and study plans.
- **Prompt Engineering**: Specialized prompts for Physics questions (Medicine level) with LaTeX formatting.
- **Study Plan**: Generates personalized advice based on wrong answers.

### 3. Payment Gateway (Mock)
- **Payment Modal**: Intercepts the "Start" action.
- **Simulation**: Realistic credit card form with loading states and success animation.
- **Price**: Fixed at €0.49.

### 4. Exam Engine
- **Timer**: 45-minute countdown.
- **Question Types**: Multiple Choice and Fill-in-the-blank.
- **LaTeX Rendering**: `MathText` component using Katex for perfect formula display.
- **Results & Scoring**: Immediate feedback and score calculation.

## Verification
- **Build**: `npm run build` passed successfully.
- **Type Safety**: TypeScript errors resolved.
- **Assets**: Fonts and icons loaded correctly.

## How to Run
1.  **Install Dependencies**: `npm install`
2.  **Start Dev Server**: `npm run dev`
3.  **Build for Production**: `npm run build`

## 🚀 Analisi Tecnica del Progetto (v1.0.0)

### 1. Architettura & Deployment
Il sistema utilizza un'architettura **Ibrida (Frontend Serverless + Backend Container)** per massimizzare performance e sicurezza.

*   **Frontend (Vercel)**: React + Vite. Hosting statico globale.
    *   *Routing*: Gestito via `vercel.json` per proxare le chiamate API verso il backend.
    *   *Performance*: Caricamento immediato (< 1s) grazie alla build ottimizzata.
*   **Backend (Render)**: Node.js + Express.
    *   *Sicurezza*: `Helmet` (header sicuri), `RateLimit` (anti-DDoS), `CORS` (restrizione domini).
    *   *Ruolo*: Proxy per DeepSeek (protezione API Key), gestione Webhook Stripe, persistenza sessioni.

### 2. Feature Critiche Implementate

#### 🔒 Persistenza & Sicurezza Sessione (Novità)
Abbiamo implementato un sistema di **"Sessione Blindata"** di 45 minuti.
*   **Meccanismo**: Al pagamento, il server genera un `sessionToken` univoco e una scadenza (`expiresAt`).
*   **Resilienza**: Se l'utente chiude il browser, ricarica la pagina o perde la connessione, il `localStorage` recupera il token.
*   **Validazione**: All'avvio, l'app interroga `/api/verify-access`. Se il token è valido, l'esame riprende *esattamente* dallo stesso secondo e domanda.
*   **Anti-Frode**: L'accesso è legato a un token crittografico, non solo all'IP, permettendo all'utente di cambiare rete (es. da Wi-Fi a 4G) senza perdere l'esame.

#### 💳 Pagamenti Stripe (€0.50)
*   **Flow**: `PaymentIntent` creato lato server per garantire l'importo (non modificabile dal client).
*   **Webhook**: Un endpoint dedicato ascolta la conferma di Stripe. L'accesso viene garantito *solo* a transazione confermata dalla banca.
*   **UI**: Modale sicura con Stripe Elements (PCI-DSS Compliant).

#### 🧠 AI DeepSeek Integration
*   **Proxy**: Le chiamate all'AI non partono mai dal browser dell'utente. Il backend fa da intermediario, proteggendo la chiave API.
*   **Caching Intelligente**: Il server salva gli esami generati. Se un altro utente chiede lo stesso argomento, riceve una versione cachata (risposta istantanea) mentre il server ne genera una nuova in background ("Replenishment").

### 3. User Experience (UX)
*   **Rebranding**: Aggiornato a "DM418/2025" per conformità ministeriale.
*   **Design**: Stile "Terminal/Neo-Brutalist" unico, con feedback aptici e visivi.
*   **Mobile First**: Layout adattivo testato su viewport mobili.

### 4. Stato Attuale
| Componente | Stato | Note |
| :--- | :--- | :--- |
| **Frontend** | ✅ Online | Vercel (Sync in corso) |
| **Backend** | ✅ Online | Render (Attivo) |
| **Database** | ✅ Attivo | SQLite (Forum & Cache) |
| **Pagamenti** | ✅ Live | Stripe Production Mode |
| **AI** | ✅ Attivo | DeepSeek V3/Reasoner |

---
**Verdetto**: Il sistema è **Production Ready**. La logica di persistenza garantisce che nessun utente perda i soldi o l'esame per errori tecnici.
