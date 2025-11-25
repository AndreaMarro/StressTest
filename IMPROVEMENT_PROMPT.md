# MASTER PROTOCOL: StressTest FISICA Improvement & Debugging

Agisci come un Senior Full-Stack Engineer e QA Lead. La tua missione è blindare l'applicazione "StressTest FISICA", ottimizzare la codebase e garantire un'esperienza utente perfetta su tutti i dispositivi.

Usa questa lista come riferimento per ogni sessione di debug o refactoring.

## 1. 🚨 CRITICAL PATHS (Priorità Assoluta)
Questi elementi bloccano il business o l'uso dell'app. Controllali SEMPRE.

### Pagamenti e Accesso
- [ ] **URL Agnostici**: Verificare che NESSUNA chiamata `fetch` usi `http://localhost` o domini hardcodati. Usare sempre path relativi (`/api/...`) per compatibilità mobile/deploy.
- [ ] **Stripe Webhook Reliability**:
    - Il webhook è l'unica fonte di verità? O c'è un fallback client-side? (Attualmente c'è polling, verificare che non vada in timeout).
    - Gestione dei "pending" o pagamenti falliti.
- [ ] **Persistenza Sessione**:
    - `localStorage` sopravvive al refresh?
    - Cosa succede se l'utente cambia rete (WiFi -> 4G) durante il test? (Il token è legato all'IP? Se sì, è un problema. *Nota: Abbiamo fixato questo usando un token di sessione UUID, ma va verificato*).
- [ ] **Cross-Device Resume**: Se pago su PC, posso continuare su Mobile? (Attualmente il link magic link lo permette, testare il flusso).

### Generazione Esami (AI)
- [ ] **JSON Parsing Robustness**: Il parser del backend crasha se DeepSeek restituisce JSON malformato? (Visto errore `SyntaxError: Bad escaped character`). Implementare un "sanitizer" di JSON prima del parse.
- [ ] **LaTeX Formatting**: Verificare che tutte le formule siano racchiuse correttamente in `$` o `$$`. L'AI spesso dimentica i delimitatori o usa `\( \)` che potrebbe non essere renderizzato da KaTeX.

## 2. 📱 MOBILE & UX (Il "Semestre Filtro" Experience)
- [ ] **Touch Targets**: I bottoni (specialmente le risposte) sono cliccabili facilmente su schermi piccoli (< 375px)?
- [ ] **Safari iOS Quirks**:
    - L'input zoomma quando cliccato? (Font-size < 16px causa zoom automatico).
    - Il `100vh` funziona correttamente o la barra degli indirizzi copre il contenuto? (Usare `dvh`).
- [ ] **Tastiera Virtuale**: Quando si apre la tastiera (es. per il codice promo), la UI si rompe o scrolla correttamente?
- [ ] **Loading States**: C'è un feedback visivo IMMEDIATO ad ogni click? (Specialmente per le chiamate API lente come `generate-exam`).

## 3. 🛠 CODE QUALITY & ARCHITECTURE
- [ ] **Monolith Refactoring (`App.tsx` > 1200 righe)**:
    - Estrarre la logica di stato (`useExamState`, `usePayment`) in custom hooks.
    - Separare le view (`StartScreen`, `ExamView`, `ResultsView`) in componenti dedicati.
- [ ] **Backend Resilience (`server/index.js`)**:
    - Rate Limiting: È attivo? È troppo aggressivo per un'aula studio con stesso IP?
    - Error Logging: I log sono leggibili su Render/Vercel? Aggiungere timestamp e context.
- [ ] **Type Safety**:
    - Eliminare `any` residui.
    - Condividere i tipi (`types/index.ts`) tra frontend e backend se possibile (o usare DTO).

## 4. ⚡ PERFORMANCE
- [ ] **Bundle Size**: Il build log segnala chunk > 500kB.
    - Implementare Code Splitting (`React.lazy`) per le rotte o componenti pesanti (es. `html2canvas`, `jspdf`).
    - Verificare se `framer-motion` può essere ottimizzato (tree-shaking).
- [ ] **Caching Strategy**:
    - Il backend ha una cache JSON su file system. È thread-safe? (Node.js è single thread, ma la scrittura su file concorrente può corrompere il JSON). Considerare Redis o SQLite per la produzione.

## 5. 🛡 SECURITY
- [ ] **Input Validation**: Il backend valida `topic` e `difficulty` o si fida del frontend? (Zod o Joi).
- [ ] **Environment Variables**: `STRIPE_SECRET_KEY` e `DEEPSEEK_API_KEY` sono protette? Il `.env` è nel `.gitignore`?
- [ ] **Injection**: I prompt per l'AI sono sanitizzati contro prompt injection?

## 6. 🧪 TEST PROTOCOL (Manuale)
Prima di ogni deploy, eseguire:
1.  **Flow Gratuito**: Genera esame -> Rispondi a caso -> Vedi risultati.
2.  **Flow Pagamento**: Paga (Test Mode) -> Redirect -> Accesso garantito.
3.  **Flow Mobile**: Apri su smartphone -> Verifica layout -> Paga.
4.  **Flow Errore**: Stacca internet -> Prova a generare -> Verifica messaggio errore (non deve esplodere).

---
**Obiettivo**: Zero "Load failed", Zero UI glitch, 100% tasso di conversione pagamenti.
