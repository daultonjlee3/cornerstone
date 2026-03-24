# Email verification (Supabase Auth)

Cornerstone expects **email confirmation** to be enabled in production so new trial accounts cannot use the app until they verify their inbox.

## Configure in Supabase

1. Open your project → **Authentication** → **Providers** → **Email**.
2. Enable **Confirm email** (and optional secure email change).
3. Ensure redirect URLs include your app URL (e.g. `https://yourdomain.com/auth/callback`).

When confirmation is enabled, `signUp` returns **no session** until the user clicks the link; the signup UI shows a generic “check your inbox” message and does not redirect to onboarding until they sign in after verification.

## Local development

You may disable confirmation in a dev project for faster iteration. If `signUp` returns a session immediately, the server logs a warning so you remember to enable confirmation before production.
