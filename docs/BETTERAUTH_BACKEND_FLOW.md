# BetterAuth Backend-First Integration Guide

This project now uses a backend-first auth flow with strict user-account control.

## What Backend Does

1. `lib/auth.js` initializes BetterAuth and mounts `/api/auth/*` routes.
2. `routes/_auth.js` protects app routes with strict checks:
   - If BetterAuth session is valid and `ba_user_id` mapping exists, it uses that user.
   - If mapping is missing, request is rejected (`USER_NOT_LINKED`).
   - Middleware does not create or mutate users.

## Frontend Flow (Recommended)

1. Sign up (recommended backend onboarding):
   - `POST /api/users`
   - This creates BetterAuth user + Monade user link.
2. Sign in:
   - `POST /api/auth/sign-in/email`
3. Resolve Monade identity:
   - `GET /api/me`
   - Requires existing BetterAuth -> Monade mapping.
4. Call business APIs using:
   - Session cookie (`credentials: include`) OR
   - BetterAuth API key (`Authorization: Bearer <key>`)

## When to Use `/api/users`

`POST /api/users` is the required onboarding path when frontend does not fully manage BetterAuth-to-Monade linking.
Direct `/api/auth/sign-up/email` alone is not sufficient for app access unless mapping is created by backend onboarding.

## Operational Notes

- Required env: `BETTER_AUTH_SECRET`
- Optional env: `BETTER_AUTH_BASE_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`
- Service tokens remain supported for internal service-to-service routes.
