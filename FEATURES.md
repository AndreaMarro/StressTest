# 🚀 StressTest FISICA - Feature List (v1.0.0)

## 🎯 Core Functionality
- **Exam Simulation**: 31-question full syllabus exams or targeted topic tests.
- **AI-Powered Generation**: Uses DeepSeek Reasoner to generate unique, high-quality physics problems on the fly.
- **Adaptive Difficulty**: Easy, Medium, and Hard modes ("L1_BASIC", "L2_STD", "L3_NIGHTMARE").
- **Real-time Feedback**: Instant correction and scoring.

## 🛡️ Security & Persistence
- **"Blindata" Session Persistence**: 
    - 45-minute secure window tied to a cryptographic session token.
    - Resilient to page reloads, browser closures, and network changes (Wi-Fi/4G switch).
    - Auto-resume functionality: users pick up exactly where they left off.
- **Anti-Cheat/Anti-Bypass**:
    - Server-side payment verification (Stripe Webhooks).
    - Access tokens validated against backend database.
    - IP-based rate limiting and access control.

## ⚡ Performance & Architecture
- **Hybrid Architecture**: Vercel (Frontend) + Render (Backend).
- **Smart Caching**: 
    - "Cache Replenishment" system: background jobs generate exams to ensure instant load times for users.
    - LocalStorage optimization for minimal latency.
- **Mobile First Design**: Fully responsive UI with touch-optimized controls.

## 🎨 UX/UI (Neo-Brutalist)
- **Terminal Aesthetic**: Monospaced fonts, high-contrast colors (Green/Black/Red), and raw borders.
- **Immersive Elements**: Typing effects, blinking cursors, and "panic" mode.
- **Italian Localization**: Full translation and cultural adaptation ("Semestre Filtro", "DM418/2025").

## 💰 Monetization
- **Micro-transactions**: €0.50 per exam via Stripe.
- **Secure Flow**: PCI-DSS compliant payment modal.

## 🛠️ Tools & Tech Stack
- **Frontend**: React, Vite, TailwindCSS, Framer Motion, Katex (Math rendering).
- **Backend**: Node.js, Express, SQLite (Forum/Cache).
- **DevOps**: Git, Vercel, Render.
