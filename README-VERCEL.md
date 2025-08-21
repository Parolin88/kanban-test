# Deploy su Vercel (Vite + React + TS)

## Requisiti
- Node.js 18 o 20
- Repo Git (GitHub/GitLab/Bitbucket)

## Passi
1. **Apri Vercel → New Project → Importa il repo.**
2. In **Project Settings → General → Root Directory** seleziona: `sg-kanban-steps15 copia`
3. In **Build & Output Settings** lascia il preset **Vite** (auto), oppure imposta manualmente:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci` (o `npm install`)
4. In **Environment Variables** aggiungi le chiavi del file `.env.example` (usa un ambiente *Preview* per il test).
5. **Deploy**: al push su un branch (es. `staging`) Vercel crea un URL `https://<project>-<hash>.vercel.app`.

## Sviluppo locale
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
# output in ./dist
```

## Note
- Questo progetto è una SPA: `vercel.json` include una rewrite verso `index.html` per supportare il client-side routing.
- Per usare una modalità *staging*, puoi aggiungere in `package.json`:
  ```json
  "scripts": {
    "build:staging": "vite build --mode staging"
  }
  ```
  e creare un file `vite.config.ts` che legga le variabili tramite `import.meta.env`.
