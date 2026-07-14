# Writing Tutor — UO WR121/WR122

A local web app that coaches students through revising WR121/WR122 essays against
the UO WR121 Essay Assessment Rubric (Thesis & Focus, Reasoning & Support,
Organization, Signal Phrasing & MLA Citation, Voice & Style, Writing Conventions
& MLA Layout). It analyzes an uploaded or pasted draft trait-by-trait, reviews
citations for signal phrasing, MLA correctness, and whether the source actually
supports the claim, and then coaches via questions in a follow-up chat.

**It will not rewrite the essay or draft replacement text.** The system prompt
(see `rubric.js`) explicitly instructs the model to coach with questions and
rubric-grounded observations instead of supplying sentences, citations, or
thesis statements — and to decline and redirect if asked to write text directly.
Chat replies also go through a second-pass check (`sanitizeReply` in
`server.js`) that re-reads each reply before it's sent and strips out any
copy-pasteable rewritten sentence it finds. This is a real mitigation, not a
hard technical guarantee — smaller/faster models (like the free Groq default
here) follow instructions less reliably than larger frontier models, so
spot-check behavior if you're deploying this for real classroom use, and
consider swapping in a stronger model via `GROQ_MODEL` (or a different
provider) if leaks show up.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set GROQ_API_KEY=gsk_...
npm start
```

Then open http://localhost:3000.

## How it works

- **Frontend** (`public/`): plain HTML/CSS/JS. Paste text or upload a `.txt`/`.docx`
  draft, pick WR121 or WR122, and submit.
- **Backend** (`server.js`): Express server. `.docx` files are converted to plain
  text with `mammoth`. `POST /api/analyze` sends the essay + rubric system prompt
  to a model hosted on Groq (OpenAI-compatible API, free tier) and forces a
  structured JSON response (via function calling) covering each rubric trait, a
  dedicated citation review, and prioritized next steps. Model defaults to
  `llama-3.3-70b-versatile`; override with `GROQ_MODEL` in `.env`.
  `POST /api/chat` continues the conversation for follow-up coaching, keeping the
  essay and prior analysis in context. Sessions are held in memory and reset when
  the server restarts.
- **Rubric** (`rubric.js`): the six WR121 rubric traits (adapted for WR122 by
  generalizing "assigned common reading" to "assigned/researched sources") plus
  the system prompt and the structured-output tool schema.

## Deploying publicly (Render)

The app is gated behind a shared password (HTTP Basic Auth) whenever
`APP_PASSWORD` is set — required for any public deployment, since the app
calls your Groq key on every request and has no other access control.

1. Push this repo to a GitHub repo under your own account:
   ```bash
   git add -A
   git commit -m "Deploy-ready writing tutor"
   # create an empty repo on github.com first, then:
   git remote add origin https://github.com/<your-username>/writing-tutor.git
   git branch -M main
   git push -u origin main
   ```
2. Create a free account at [render.com](https://render.com) if you don't have one.
3. In the Render dashboard: **New +** → **Web Service** → connect the GitHub repo you just pushed.
   (Render will detect `render.yaml` and prefill the build/start commands; if it
   doesn't, set Build Command to `npm install` and Start Command to `npm start`.)
4. Under the service's **Environment** tab, set:
   - `GROQ_API_KEY` — your Groq key
   - `APP_PASSWORD` — a shared password you'll give to whoever you're sharing this with
   - `GROQ_MODEL` — optional, only if you want a non-default model
5. Deploy. Render gives you a public `https://<your-service>.onrender.com` URL.
   Visiting it will prompt for HTTP Basic Auth — any username, the `APP_PASSWORD` you set.

Notes specific to Render's free tier: the service spins down after 15 minutes
of inactivity and takes ~30-60s to wake back up on the next request; sessions
are in-memory, so a spin-down/restart clears any in-progress chat sessions.

## Notes & limitations

- Sessions are in-memory only — restarting the server clears all active
  conversations. Fine for personal/local use; would need a real datastore for
  multi-user deployment.
- Essays are capped at ~60,000 characters per analysis; longer drafts are
  truncated with a note in the UI.
- Scanned/image-based PDFs aren't supported (no OCR); only `.txt` and `.docx`
  uploads, or pasted text.
- The rubric here is WR121's official essay rubric; WR122 support generalizes
  the "common reading" language to "researched sources" but hasn't been
  reviewed against an official WR122-specific rubric if your section uses one.
