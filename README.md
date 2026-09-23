# 🦤 TCHOMBO

**How far can you push it?**

A small, real-time multiplayer party game for 2–6 friends, built around factual
questions about Mauritius and the Mascarene Islands. Players take turns naming
increasing estimates until someone calls **TCHOMBO** on the previous player,
betting they've gone over the true answer. Guess wrong and you collect dodos.
First to 30 dodos loses.

No accounts, no downloads, no payment — just a 4-digit room code shared over
WhatsApp.

## Cost: €0

- **Hosting**: one [Render](https://render.com) free Web Service (Node + Socket.IO
  serving the built React app). Sleeps after 15 minutes idle, wakes in a few
  seconds — fine for a friends game.
- **Database**: none. Game state lives in server memory, keyed by room code.
  Questions live in a version-controlled JSON file.
- **Everything else**: open-source npm packages, Google Fonts (free), and
  sound effects synthesized in-browser with the Web Audio API (no audio files
  to license).

## Project structure

```
shared/   TypeScript types + the pure game-rules engine (unit tested, no I/O)
server/   Express + Socket.IO room manager, question loader, admin API
client/   React + Vite + Tailwind, mobile-first UI, i18n-ready (en.json)
```

## Running locally

Requires Node 20+.

```bash
npm install
npm run build -w client   # builds the client once so the server can serve it
npm run dev:server        # http://localhost:3001 (serves the built client + API)
```

For live client reloading while developing UI, run these in two terminals instead:

```bash
npm run dev:server   # API + sockets on :3001
npm run dev:client   # Vite dev server on :5173, proxies /api and /socket.io to :3001
```

Then open http://localhost:5173.

## Tests

```bash
npm test
```

Covers the full rule set (RULE 1–15 in the spec): turn order, strictly-increasing
submissions, the exact-answer-is-safe boundary (including the 100 vs 100.01
decimal edge case), correct/incorrect TCHOMBO resolution, dodo/difficulty
mapping, starting-player rotation, the 30-dodo loss condition, question
no-repeat, reconnection, and 2/4/6-player games.

## Deploying to Render (free)

1. Push this repo to GitHub.
2. In Render, "New +" → "Blueprint", point it at the repo — it will read
   `render.yaml` and create one free Web Service.
3. Set the `ADMIN_PASSWORD` environment variable to something private.
4. Done. Share `https://<your-app>.onrender.com` with friends.

## Managing questions

Questions live in `server/data/questions.json`. Each entry:

```json
{
  "id": "ENV-014",
  "category": "nature_environment",
  "question": "How many species of scleractinian (hard) coral have been recorded around Mauritius?",
  "answer": 159,
  "unit": "species",
  "allow_decimal": false,
  "difficulty": "hard",
  "dodo_penalty": 4,
  "source": "Ministry of Agro-Industry, Mauritius — biodiversity report",
  "source_note": "Figure from the ministry's national biodiversity synthesis.",
  "active": true,
  "status": "live"
}
```

- `dodo_penalty` must match `difficulty`: easy → 2, medium → 3, hard → 4, very_hard → 5.
- `status: "draft"` + `active: false` keeps a question out of live games — use this
  for anything AI-generated or not yet fact-checked, until you've reviewed it.
- Only `active: true, status: "live"` questions are ever served to players.

A minimal admin page at `/admin` (Basic Auth, password = `ADMIN_PASSWORD`) lets
you add/edit/deactivate/delete questions without touching JSON by hand.

**Important:** Render's free tier disk is not persistent across deploys/restarts.
Edits made through `/admin` on the live site can be lost when the service
restarts. For anything you want to keep, edit `server/data/questions.json`
locally (by hand or via `/admin` run locally against your checkout) and commit
+ push — that's the durable path.

## What's deliberately not here

No accounts, payments, chat, ads, analytics, or background music — see the
game brief. The dodo is a small recurring character, not the whole visual
identity.
