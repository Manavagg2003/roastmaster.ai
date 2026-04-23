# Roastmaster — Startup Idea Roast Web App

## Original Problem Statement
Build a web app on startup idea roast at Rs 49. First roast free, then Rs 49 per roast, payments via Razorpay. Brutal/savage tone, shareable downloadable roast cards, and a leaderboard of most roasted ideas.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT auth (PyJWT + bcrypt). Gemini 3 Flash via `emergentintegrations` library. Razorpay SDK for orders; manual HMAC-SHA256 signature verification for payment confirmation.
- **Frontend**: React 19 + React Router 7. Brutalist/tabloid zine aesthetic — Anton display + Playfair Display (italic) + JetBrains Mono. Tailwind + shadcn/ui primitives (sonner for toast). `html-to-image` for downloadable roast cards. `react-fast-marquee` for kinetic hero marquee. Razorpay Checkout.js loaded dynamically.
- **Routes**: `/` landing, `/login`, `/signup`, `/roast/:id`, `/leaderboard`, `/dashboard`.

## User Personas
- **Indian early-stage founder** looking for honest, no-BS reality check before pitching.
- **Students / aspiring founders** wanting viral, shareable content for Twitter/LinkedIn.
- **Comedy audience** who just want entertainment from bad startup ideas.

## Core Requirements (static)
1. First roast free after email signup (JWT).
2. Rs 49 per subsequent roast via Razorpay (INR).
3. AI-generated roast with score (1-10), 5 callouts, 5 fixes, verdict, one-liner.
4. Shareable + downloadable PNG roast card.
5. Public leaderboard ("Hall of Shame") sorted by savagery.

## What's Been Implemented (2026-04-23)
- JWT email/password auth (register, login, /auth/me) with bcrypt
- Roast generation via Gemini 3 Flash (emergentintegrations, EMERGENT_LLM_KEY)
- Entitlement logic: free roast consumed -> paid_roasts_balance; 402 when empty
- Razorpay order creation (Rs 49 = 4900 paise) + HMAC-SHA256 signature verification
- Leaderboard endpoint sorted by score asc
- My-roasts history endpoint
- Full React UI: brutalist dark theme, Anton/Playfair/JetBrains Mono, grain texture, kinetic marquee, flashbulb animation, zine-style roast card
- Downloadable PNG via html-to-image + Web Share API + copy-link fallback
- Paywall modal triggering Razorpay Checkout.js on 402
- Test credentials seeded at /app/memory/test_credentials.md
- Backend tested end-to-end: 24/24 tests passing (auth, roast, paywall, payment signature, leaderboard)

## Prioritized Backlog
- **P1**: Email verification / OTP to prevent signup abuse (currently anyone with an email can get one free roast per email)
- **P1**: Rate limit /api/roast/generate (prevent LLM abuse beyond entitlement)
- **P2**: Roast persona presets (Ricky Gervais mode, VC bro mode, Shark Tank Harsh mode)
- **P2**: Public/private toggle per roast (currently all roasts show in leaderboard)
- **P2**: OG meta image for each roast URL (viral preview cards)
- **P3**: Admin panel to moderate leaderboard entries
- **P3**: Referral system ("give a friend a free roast, get Rs 20 credit")
- **P3**: Bundle pricing (5 roasts for Rs 199)
