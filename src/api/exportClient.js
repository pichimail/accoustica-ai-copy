/**
 * Export Bridge Client
 *
 * This file re-exports the Base44 SDK for the remaining platform-specific calls
 * (auth, integrations, analytics) that components still use directly.
 *
 * TODO_EXPORT_REPLACE_WITH_NEXT_API:
 *   - base44.auth.me()        → custom /api/auth/me endpoint (Google Auth)
 *   - base44.auth.isAuthenticated() → session cookie check
 *   - base44.auth.logout()    → custom /api/auth/logout
 *   - base44.auth.redirectToLogin() → NextAuth signIn()
 *   - base44.auth.updateMe()  → custom /api/user/update
 *   - base44.users.inviteUser() → admin API route
 *   - base44.integrations.Core.UploadFile() → custom file upload to cloud storage
 *   - base44.integrations.Core.SendEmail() → custom email service (Resend, etc.)
 *   - base44.analytics.track() → custom analytics (PostHog, Mixpanel, etc.)
 *
 * TODO_EXPORT_REPLACE_WITH_GOOGLE_AUTH:
 *   All auth.* methods above should route through NextAuth.js with Google provider.
 *   The user object shape should remain compatible: { id, email, full_name, role }.
 *
 * TODO_EXPORT_REPLACE_WITH_NEON_DB:
 *   Entity CRUD (base44.entities.X.*) is abstracted into src/api/trackClient.js
 *   and should be replaced with NeonDB queries via Drizzle ORM or raw SQL.
 *
 * After export, this file can be deleted and components should import directly
 * from their respective API route wrappers.
 */

import { base44 } from '@/api/base44Client';

// Re-export the base44 client for auth, integrations, and other platform services
// that haven't been fully abstracted yet. Components should prefer the dedicated
// clients (trackClient, musicClient, llmClient) for data operations.
export { base44 };

export default base44;