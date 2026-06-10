# Accoustica Pro

Accoustica Pro is a Vite + React AI music studio built from a Base44 app export. It includes music generation, remixing, mashups, voice/persona workflows, mastering tools, video tools, a global audio player, library pages, social/discovery pages, and admin screens.

## Tech stack

- Vite 6
- React 18
- Tailwind CSS
- Radix UI primitives
- TanStack Query
- Base44 SDK and Base44 Vite plugin
- Framer Motion
- Sonner and shadcn-style UI components

## Required environment

Create a `.env.local` file from `.env.example` and fill the Base44 values before running locally.

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Scripts

```bash
npm run dev        # Start local Vite dev server
npm run build      # Build production bundle
npm run preview    # Preview production build
npm run lint       # Run ESLint quietly
npm run lint:fix   # Auto-fix supported ESLint issues
npm run typecheck  # Run JS/JSX type checking through jsconfig
```

## Production hardening notes

This repo still depends on Base44 runtime services for auth, entities, integrations, and functions. For stable non-Base44 deployment, verify these before release:

1. `VITE_BASE44_APP_ID`
2. `VITE_BASE44_BACKEND_URL`
3. Base44 auth redirects
4. Function names used by the app, including music generation, status polling, mastering, stems, video, personas, and track details
5. Storage/CORS behavior for audio playback and waveform decoding

## Protected areas

Most studio pages require login. Admin pages require a user with `role: "admin"`.

## Known follow-up work

- Remove `@ts-nocheck` from core app files gradually.
- Move audio event listeners into cleanup-safe effects.
- Move track URL refresh/write logic out of the player context.
- Replace global scroll locks and hidden scrollbars with scoped app-shell rules.
- Convert repeated inline styles into design tokens or Tailwind utilities.
