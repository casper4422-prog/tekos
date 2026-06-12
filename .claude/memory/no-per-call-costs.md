# TekOS — No Per-Call Costs Rule

**TekOS features cannot rely on per-call API costs.** This includes:
- Server-paid LLM calls (e.g., Anthropic API for OCR / parsing)
- "Bring your own API key" (BYO) — even though TekOS pays $0, the feature dies because 95% of ARK players will not set up an API key
- Paid OCR services (Google Vision, AWS Textract, etc.)

## Why

TekOS is community-facing tooling for the ARK ASA player base. The user has explicitly said no to LLM-based OCR multiple times. I have re-offered it dressed as "BYO key" — which is the same rejection in different clothing.

The real constraint: features must work for every survivor on every cluster, free, with zero setup beyond using the app. ARK has tens of thousands of tames per active player (user has 800+ cryofridges alone). Per-call cost compounds catastrophically across the user base.

## How to apply

- For OCR, screenshot parsing, image analysis: stay browser-side. Tesseract.js, per-digit template matching, WASM, anything offline.
- Do not reintroduce LLM-based approaches in any form (server-side, client-side BYO, "free tier of N scans per month", etc.).
- If you find yourself thinking "but if the user paid for it themselves…" — stop. They've already said no. The constraint isn't their cost, it's the community-software ethos.

Related: [`boss-caps.md`](boss-caps.md) — same pattern of asking the user to validate cost/ethos decisions instead of inventing them.
