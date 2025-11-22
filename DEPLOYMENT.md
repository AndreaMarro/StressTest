# 🚀 Guida al Deployment: Vercel + Render

Hai scelto la combinazione vincente: **Vercel** per il sito e **Render** per il server.
Ecco la procedura esatta.

## 1. Prepara il Codice (GitHub)
Se non l'hai ancora fatto, devi caricare questo progetto su GitHub.
1.  Vai su GitHub e crea una nuova repository "stresstest".
2.  Nel terminale del progetto:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/IL_TUO_UTENTE/stresstest.git
    git push -u origin main
    ```

---

## 2. Configura il Backend (Render)
Render ospiterà il "cervello" (Node.js).

1.  Vai su [dashboard.render.com](https://dashboard.render.com).
2.  Clicca **New +** -> **Web Service**.
3.  Seleziona la repository GitHub `stresstest`.
4.  Compila così:
    - **Name**: `stresstest-api` (o quello che vuoi)
    - **Root Directory**: `server` (⚠️ FONDAMENTALE)
    - **Environment**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `npm start`
5.  Scorri giù a **Environment Variables** e aggiungi:
    - `DEEPSEEK_API_KEY`: `sk-...` (La tua chiave)
    - `STRIPE_SECRET_KEY`: `sk_live_...` (La tua chiave segreta Stripe)
    - `CLIENT_URL`: `https://stresstest-fisica.vercel.app` (Questo lo saprai dopo, per ora metti `*` o lascialo vuoto).
6.  Clicca **Create Web Service**.
7.  Aspetta che il deploy finisca. In alto a sinistra vedrai l'URL (es. `https://stresstest-api.onrender.com`). **Copialo.**

---

## 3. Configura il Frontend (Vercel)
Vercel ospiterà il sito (React).

1.  Nel tuo codice locale, apri il file `vercel.json` (l'ho appena creato).
2.  Modifica la riga `destination` inserendo l'URL di Render che hai appena copiato:
    ```json
    "destination": "https://stresstest-pvuf.onrender.com/api/$1"
    ```
3.  Fai un commit e push di questa modifica:
    ```bash
    git add vercel.json
    git commit -m "Configura URL backend"
    git push
    ```
4.  Vai su [vercel.com](https://vercel.com) -> **Add New Project**.
5.  Importa la repository `stresstest`.
6.  **Environment Variables**:
    - `VITE_STRIPE_PUBLISHABLE_KEY`: `pk_live_...` (La tua chiave pubblica Stripe).
7.  Clicca **Deploy**.

---

## 4. Tocco Finale
Una volta che Vercel ha finito, ti darà l'URL del sito (es. `https://stresstest-fisica.vercel.app`).

1.  Torna su **Render** -> Environment Variables.
2.  Aggiorna `CLIENT_URL` con l'URL di Vercel (senza slash finale).
3.  Render si riavvierà automaticamente.

**Fatto!** 🎉
Il tuo sito è online, sicuro e pronto a incassare.
