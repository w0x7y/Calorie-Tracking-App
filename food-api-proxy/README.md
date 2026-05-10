# Food API Proxy

This Cloudflare Worker keeps the real CalorieNinjas API key off the mobile client.

## Why this option

- good fit for a tiny `GET /nutrition` proxy
- generous free tier for a hobby or early-launch app
- no always-on server to manage
- fast global edge deployment

## Endpoints

- `GET /health`
- `GET /nutrition?query=banana`

The response from `/nutrition` is passed through in a CalorieNinjas-compatible shape:

```json
{
  "items": []
}
```

## Setup

1. Create a Cloudflare account.
2. In this folder, install dependencies:

```bash
npm install
```

3. Authenticate Wrangler:

```bash
npx wrangler login
```

4. Add the CalorieNinjas key as a Worker secret:

```bash
npx wrangler secret put CALORIE_NINJAS_API_KEY
```

5. Run locally:

```bash
npm run dev
```

6. Deploy:

```bash
npm run deploy
```

After deploy, Cloudflare will print a Worker URL such as:

```text
https://calorie-tracking-food-api.<your-subdomain>.workers.dev
```

## App configuration

Set the mobile app to use the deployed Worker URL:

```bash
EXPO_PUBLIC_FOOD_API_BASE_URL=https://calorie-tracking-food-api.<your-subdomain>.workers.dev
```

When `EXPO_PUBLIC_FOOD_API_BASE_URL` is set, the app uses the proxy instead of the direct client-side API key.

## Notes

- responses are cached at the Worker for 15 minutes
- CORS is enabled so the Expo web target can also call the proxy
- this Worker currently proxies only food search, not barcode lookup
