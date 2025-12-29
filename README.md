# Accoustica AI Studio (Supabase)

Mobile-first AI music + video studio built on Supabase Postgres, Edge Functions, and Storage with Runway/KIE video tools, lyric videos, and profile publishing.

## Quick Start (Local)

1) Install dependencies:

```bash
npm install
```

2) Create `.env` (copy from example):

```bash
cp .env.example .env
```

Fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3) Start dev server:

```bash
npm run dev
```

Open the URL shown by Vite.

4) Apply database schema:

- Run the SQL in `supabase/migrations/001_init.sql` in your Supabase project.

5) Create a public storage bucket:

- Create a bucket named `app-assets` (or set `VITE_SUPABASE_STORAGE_BUCKET`).

## Environment Variables

### Frontend (Vite)

Required in `.env` or Vercel project env:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:

- `VITE_SUPABASE_STORAGE_BUCKET` (defaults to `app-assets`)
- `VITE_SUPABASE_AUTH` (set to `0` to bypass login locally)
- `VITE_DEFAULT_ADMIN_EMAIL` + `VITE_DEFAULT_ADMIN_PASSWORD` + `VITE_DEFAULT_ADMIN_NAME` (dev-only admin bootstrap)
- `VITE_GOOGLE_AUTH_ENABLED` (shows Google sign-in button)
- `VITE_GOOGLE_CLIENT_ID` (used for UI gating only)

Server-only (do not prefix with `VITE_`):

- `GOOGLE_CLIENT_SECRET` (store for reference or server-side usage)

### Supabase Edge Functions

These are used by functions in `/functions` (not Vite/Vercel):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_FUNCTION_URL` (base URL for callbacks, e.g. `https://<project>.supabase.co/functions/v1`)

See `functions/.env.example` for a complete Edge Function env template.

### External API Keys

Set these in your Edge Function environment:

- `KIE_API_KEY` (Runway + Suno generation)
- `SUNO_API_KEY` (if separate from KIE)
- `OPENAI_API_KEY` (LLM + image generation)
- `OPENAI_MODEL` (optional)
- `OPENAI_IMAGE_MODEL` (optional)
- `RESEND_API_KEY` + `EMAIL_FROM` (SendEmail)
- `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM` (SendSMS)

## Admin Setup (Important)

Log in as an admin and open **Admin Dashboard > App Controls** to configure:

- `kie_api_key` (required for music/video generation and uploads)
- `watermark_text` and `watermark_logo_url`
- Google OAuth settings (client ID + secret) and Google login toggle
- Feature toggles (music generation, lyric video, Runway types, cover art, discover videos)
- Default theme

Also ensure your admin user has `role = 'admin'` in the `profiles` table.

If you do not configure these, generation features will fail.

## Authentication Setup

### Default Admin (local)

1) Set `VITE_DEFAULT_ADMIN_EMAIL` + `VITE_DEFAULT_ADMIN_PASSWORD` in `.env`.
2) Ensure `SUPABASE_SERVICE_ROLE_KEY` is available in your environment (or `.env` for local scripts).
3) Run:

```bash
npm run create-admin
```

This uses the Supabase service role key to create or promote the admin user.

### Google Sign-In (Supabase)

1) In Supabase Dashboard, enable the Google provider and set the client ID/secret.
2) Set `VITE_GOOGLE_AUTH_ENABLED=1` to show the Google button in the UI.
3) Optionally store the Google client ID/secret in **Admin Dashboard > App Controls** for reference.

## Local QA Checklist (Manual)

Use this to verify UI/UX and backend behavior locally:

- Home: hero loads, CTA routes to Studio, floating album art renders.
- Studio: toggle between Music Studio / Video Studio.
- Music Studio: generate music in Simple + Custom mode; verify tracks appear in Library.
- Music Studio: generate lyric video and music video; check Profile > Videos.
- Video Studio (Runway): test Text, Image, Music, Extend, Uploads tabs.
- Profile: switch themes in Appearance, publish/unpublish videos to Discover.
- Discover: public videos show in Videos tab.
- Admin: App Controls save + feature toggles reflect in UI.

## Deploy to Vercel

1) Import the repo into Vercel.
2) Set Vercel Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3) Build settings:

- Build Command: `npm run build`
- Output Directory: `dist`

The repo already includes `vercel.json` with these settings.

## Notes

- Authentication and data are handled by Supabase.
- Video generation uses KIE Runway + Suno endpoints via Supabase Edge Functions.
- Watermarking is applied to cover art and lyric videos via Edge Functions.

## Troubleshooting

- If auth fails: verify Supabase URL/anon key and user credentials.
- If generation fails: verify `kie_api_key` and feature toggles in Admin Dashboard.
- If callbacks fail: ensure `SUPABASE_FUNCTION_URL` is set in Edge Function env.
