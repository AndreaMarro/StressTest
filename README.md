# Deploying **StressTest FISICA**

## Overview
The project consists of a **frontend** built with Vite/React (TypeScript) and a **backend** (Express) that serves the API and, in production, the static files.

## 1️⃣ Deploy the **backend** on **Render**
1. Push the repository to GitHub (or any Git provider).
2. In Render, create a **Web Service** and **import the repository**.
3. Render will automatically detect the `render.yaml` file we added:
   ```yaml
   services:
     - type: web
       name: stresstest-fisica
       env: node
       plan: free
       buildCommand: npm install && npm run build && cd server && npm install
       startCommand: cd server && node index.js
       envVars:
         - key: NODE_VERSION
           value: 20.11.0
         - key: STRIPE_SECRET_KEY
           sync: false
         - key: DEEPSEEK_API_KEY
           sync: false
         - key: CLIENT_URL
           value: https://<your‑vercel‑project>.vercel.app
   ```
4. After the first deploy Render will set a **PORT** environment variable automatically. The server reads it (`process.env.PORT`).
5. Add the **secret** environment variables (`STRIPE_SECRET_KEY`, `DEEPSEEK_API_KEY`) in the Render dashboard.
6. Once the service is up, note the URL (e.g. `https://stresstest-fisica.onrender.com`). This will be the API endpoint.

## 2️⃣ Deploy the **frontend** on **Vercel**
1. In the same repository, Vercel will detect the `vercel.json` we added:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://stresstest-fisica.onrender.com/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   *The first rule proxies all `/api/*` calls to the Render backend.*
2. Create a new Vercel project and **link it to the repository**.
3. Vercel will run `npm install` and `npm run build` automatically (our `build` script compiles the frontend into the `dist` folder).
4. No extra environment variables are required for the frontend, but you may set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` if you want to expose the Stripe key.
5. After the deployment, Vercel will serve the static files from `dist/`. The rewrite rule ensures the SPA works and API calls go to Render.

## 3️⃣ Verify the deployment
- Open the Vercel URL (e.g. `https://<your‑vercel‑project>.vercel.app`).
- The app should load, and any API request (exam generation, payment, forum) will be forwarded to the Render backend.
- Check the console/network tab for any 404/500 errors.

## 4️⃣ Optional – Continuous Deployment
Both Render and Vercel watch the same Git repository. Every push to `main` (or the branch you configure) will trigger a new build on both platforms, keeping the frontend and backend in sync.

---
### Files you may want to keep handy
- **`render.yaml`** – Render service definition (already in the repo).
- **`vercel.json`** – Vercel rewrite configuration (already in the repo).
- **`build_deploy.sh`** – Local build script you can run on a VPS if you prefer a manual deploy.

Feel free to ask if you need help linking the repo, setting secrets, or customizing the domain names! 🚀
# Vercel deploy trigger 1764023140
