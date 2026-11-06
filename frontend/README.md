# Frontend

React 19 + Vite + TypeScript + Tailwind. The onboarding wizard, the React Flow
mapping canvas and the inventory assistant.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint
```

It expects the API on `http://localhost:8000`; override with `VITE_API_BASE_URL`,
and the tenant with `VITE_TENANT_ID`.

See the [root README](../README.md) for the whole system and
[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for how the pieces fit.
