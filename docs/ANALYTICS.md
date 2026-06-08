# Analytics

Visitor analytics powered by Google Analytics 4 and Microsoft Clarity.

## Architecture

```
User Browser
    │
    ├──► next/script ──► Google Analytics 4 (gtag.js)
    │       │                    │
    │       │              page_view (auto)
    │       │              file_upload
    │       │              file_download
    │       │              wallet_connected
    │       │              login_success
    │       │              dashboard_opened
    │       │              settings_opened
    │       │              shared_file_opened
    │       │              frontend_error
    │       │
    └──► next/script ──► Microsoft Clarity
                │
          Session recordings
          Heatmaps
          Custom events:
            wallet_connected
            wallet_disconnected
            upload_started
            upload_completed
            download_started
            download_completed
            dashboard_opened
            settings_opened
            shared_file_opened
```

## Analytics Files

| File | Purpose |
|------|---------|
| `src/lib/analytics.ts` | GA4 helper functions (`trackPageView`, `trackEvent`, etc.) |
| `src/lib/clarity.ts` | Clarity helper functions (`identifyUser`, `setTag`, etc.) |
| `src/components/AnalyticsProvider.tsx` | Automatic page view tracking on route change |
| `src/app/layout.tsx` | GA4 + Clarity script injection via `next/script` |

## Event Reference

### Google Analytics 4 Events

| Event | Parameters | Trigger |
|-------|------------|---------|
| `page_view` | `page_path` | Every route change (via AnalyticsProvider) |
| `file_upload` | `file_name`, `file_size`, `file_type` | Successful file upload |
| `file_download` | `file_name` | Download button clicked |
| `wallet_connected` | `wallet_address` (hashed) | Wallet connects |
| `login_success` | `wallet_address` (hashed) | Successful wallet login |
| `dashboard_opened` | — | Dashboard page mounted |
| `settings_opened` | — | Settings page mounted |
| `shared_file_opened` | — | Shared files page mounted |
| `frontend_error` | `page`, `error_message` | Recoverable error caught by error boundary |

### Microsoft Clarity Events

| Event | Trigger |
|-------|---------|
| `wallet_connected` | Wallet connects |
| `wallet_disconnected` | Wallet disconnects |
| `upload_started` | Upload flow begins |
| `upload_completed` | Upload finishes successfully |
| `download_started` | Download initiated |
| `download_completed` | Download finishes successfully |
| `dashboard_opened` | Dashboard page mounted |
| `settings_opened` | Settings page mounted |
| `shared_file_opened` | Shared files page mounted |

### Clarity Tags

| Tag | Value | Set when |
|-----|-------|----------|
| `wallet_address` | Hashed wallet address | Wallet connects |

## Setup Guide

### 1. Google Analytics 4

1. Go to https://analytics.google.com and create a new GA4 property.
2. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`).
3. Set the environment variable.

### 2. Microsoft Clarity

1. Go to https://clarity.microsoft.com and create a new project.
2. Copy the **Project ID** (numeric string).
3. Set the environment variable.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No | Google Analytics 4 Measurement ID (`G-...`). Leave blank to disable GA4. |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | No | Microsoft Clarity Project ID (numeric). Leave blank to disable Clarity. |

Add to `apps/web/.env` or `apps/web/.env.local`:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_CLARITY_PROJECT_ID=123456789
```

## Privacy

- Wallet addresses are **hashed** before being sent to analytics providers.
- No private keys, seed phrases, or file contents are ever collected.
- No passwords are collected.
- Only metadata (file names, file sizes, file types, page paths) is tracked.
- GA4 and Clarity scripts **only load when the respective env var is set**.
- No analytics scripts run in development (scripts load at build time, not dev time).

## Testing

### Verify GA4

1. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` in `.env`.
2. Run `npm run build && npm run start` (GA does not fire in dev mode by default).
3. Open the app and navigate to a few pages.
4. Open **Google Analytics DebugView** (`Reports > DebugView`) to see real-time events.
5. Alternatively, install the **Google Analytics Debugger** Chrome extension and check the console for `gtag` calls.

### Verify Clarity

1. Set `NEXT_PUBLIC_CLARITY_PROJECT_ID=123456789` in `.env`.
2. Run `npm run build && npm run start`.
3. Open the app and interact.
4. Open **Clarity Dashboard** → select your project → **Recordings** should show sessions.

### Verify Page Tracking

1. Open browser DevTools → Network tab.
2. Filter by `google-analytics` or `clarity`.
3. Navigate between pages — you should see `collect` requests to GA and `clarity.ms` calls.

### Verify Custom Events

1. Upload a file → check GA DebugView for `file_upload` event.
2. Download a file → check GA DebugView for `file_download` event.
3. Connect a wallet → check GA DebugView for `wallet_connected` event.

## Production Deployment

1. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in the production environment.
2. Set `NEXT_PUBLIC_CLARITY_PROJECT_ID` in the production environment.
3. Rebuild and deploy.
4. Verify in GA DebugView and Clarity Dashboard.
5. GA4 data may take 24–48 hours to appear in standard reports (DebugView is real-time).

## Code Quality

- TypeScript strict mode is enforced.
- No `any` types used.
- All tracking functions are wrapped in try/catch — analytics failures never break the app.
- Scripts load via `next/script` with `strategy="afterInteractive"` for optimal performance.
- Analytics only initialize when env vars are set — zero overhead when disabled.
