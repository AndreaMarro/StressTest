# StressTest FISICA - Project Analysis

## 1. Project Overview
**StressTest FISICA** is a web application designed to prepare students for the medical school admission test (TOLC-MED/VET) in Physics. It simulates the high-pressure environment of the actual exam ("Semestre Filtro") with a Neo-Brutalist, terminal-style aesthetic.

**Key Value Proposition:**
- **AI-Generated Exams**: Uses DeepSeek Reasoner to create unique, high-quality physics problems on the fly.
- **"Blindata" Access**: 45-minute secure sessions tied to payments, preventing sharing and ensuring focus.
- **Monetization**: Micro-transactions (€0.50 per exam) via Stripe.

## 2. Architecture & Tech Stack

### Frontend (Client)
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS (Custom "Terminal" theme)
- **State Management**: React `useState` / `useEffect` + `localStorage` for persistence.
- **Math Rendering**: KaTeX (via `MathText` component).
- **Deployment**: Vercel.

### Backend (Server)
- **Runtime**: Node.js / Express.
- **AI Integration**: OpenAI SDK (configured for DeepSeek API).
- **Payments**: Stripe API.
- **Data Persistence**: 
    - JSON files (`exam_cache.json`, `access_tokens.json`) for simplicity and portability.
    - SQLite (`forum.db`) exists but appears unused in the main logic analyzed.
- **Deployment**: Render.

## 3. Key Features Analysis

### 3.1 Exam Generation (`server/services/examGenerator.js`)
- **Prompt Engineering**: The system prompt is highly sophisticated, instructing the AI to act as an "elite professor" and enforcing strict constraints (syllabus coverage, difficulty, LaTeX formatting).
- **Validation**: Includes a `validateSyllabusCoverage` function to ensure generated exams cover required topics (Mechanics, Fluids, etc.).
- **Caching Strategy**: 
    - **Background Replenishment**: `replenishCache` runs in the background to generate exams ahead of time.
    - **Cache-First**: The API checks `exam_cache.json` first. If a hit is found, it's served immediately. If not, it falls back to synchronous generation (slower but reliable).

### 3.2 Access Control & Security (`server/index.js`)
- **Session Tokens**: Access is granted via a unique `sessionToken` + `examId` pair.
- **Time Limit**: 45-minute strict window. Access expires automatically.
- **IP Binding**: Initial access is granted to the request IP, but the session token allows for some mobility (e.g., Wi-Fi to 4G switch), though the code primarily checks `examId` + `sessionToken`.
- **Rate Limiting**: `express-rate-limit` protects API endpoints, with stricter limits for AI generation (expensive) and payments.

### 3.3 Payments (Stripe)
- **Flow**: User clicks "Initiate" -> `create-payment-intent` -> Stripe Modal -> Payment Success -> Webhook/Redirect -> Access Granted.
- **Verification**: Robust verification via both frontend redirect checks and backend webhooks (`payment_intent.succeeded`).

### 3.4 UI/UX (Frontend)
- **Aesthetic**: Consistent "Hacker/Terminal" theme with green-on-black colors, monospaced fonts, and blinking cursors.
- **Responsiveness**: Mobile-first design with a dedicated mobile bottom dock.
- **Feedback**: Immediate feedback in "Results" view with detailed explanations and "User Input" vs "Expected Output" comparison.

## 4. Code Quality & Observations

### Strengths
- **Robust Error Handling**: The backend validates environment variables on startup and handles API errors gracefully.
- **Resilience**: The frontend uses `localStorage` extensively to save state (`stressTestSession`, `answers_...`), allowing users to refresh or close the tab without losing progress.
- **Modularity**: The `examGenerator` service is well-isolated. Frontend components (`MathText`, `PaymentModal`) are reusable.

### Areas for Improvement / Risks
- **JSON Persistence**: Using JSON files for storage (`exam_cache.json`) is fine for a prototype but will have concurrency issues at scale (race conditions on write). SQLite or Redis would be better for production.
- **Security**: The `CLIENT_URL` is currently a wildcard (`*`) in some places or defaults to it. This should be locked down for production.
- **Frontend Monolith**: `App.tsx` is very large (~950 lines). It should be refactored to move `StartView`, `ExamView`, `ResultsView` into separate files.
- **AI Cost/Latency**: Synchronous generation (fallback) can take up to 60-90 seconds. The cache pool needs to be large enough to avoid this.

## 5. Conclusion
The project is in a **very advanced state**. The core loops (Generate -> Pay -> Take -> Review) are implemented and robust. The "Neo-Brutalist" identity is strong. The main technical debt lies in the file-based persistence layer and the monolithic `App.tsx`, but these are not blockers for an initial launch.
