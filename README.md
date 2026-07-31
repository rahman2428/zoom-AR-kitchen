# Mobile Kitchen Unit Display App (`kitchen_app`)

Standalone, real-time Mobile Kitchen Display web application for restaurant kitchen staff.

## Features
- **Staff PIN Authentication**: Access protected by default PIN `8899` or custom `KITCHEN_STAFF_KEY`.
- **CORS API Synchronization**: Polls live paid orders from main AR Restaurant backend (`http://localhost:3000/api/orders`).
- **Live Chime Alerts**: Dual-tone Web Audio chime when new orders arrive.
- **One-Tap Status Controls**: `Start Prep` → `Mark Ready` → `Complete Order`.
- **Lock / Shift End Security**: One-click screen locking.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server (runs on port `3001` by default):
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3001` in any desktop browser, tablet, or smartphone. Log in with Staff PIN `8899`.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_MENU_API_URL` | Cross-Origin API endpoint for main menu backend | `http://localhost:3000/api/orders` |

## Production Deployment

You can deploy this `kitchen_app` directory separately to Vercel, Cloudflare Pages, Netlify, or any Node.js host:

```bash
npm run build
npm run start
```
