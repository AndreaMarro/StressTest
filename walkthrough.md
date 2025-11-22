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

## Live Deployment
- **Frontend (Vercel)**: [https://stress-test-taupe.vercel.app](https://stress-test-taupe.vercel.app)
- **Backend (Render)**: [https://stresstest-pvuf.onrender.com](https://stresstest-pvuf.onrender.com)

## Deployment Steps
1.  **Backend**: Deployed to Render (Node.js service).
2.  **Frontend**: Deployed to Vercel (Vite SPA).
3.  **Connection**: `vercel.json` proxies API requests to Render.

