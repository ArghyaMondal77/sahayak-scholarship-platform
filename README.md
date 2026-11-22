# Sahayak — Claim What's Yours

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=nodedotjs&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?logo=vercel&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-REST-4285F4?logo=googlegemini&logoColor=white)

> **Sahayak helps West Bengal students find the scholarships they are likely eligible for — and the verified help needed to apply — in English, বাংলা, and हिन्दी.**

---

## The Problem

Students from Class 5 through PhD in West Bengal miss out on legitimate scholarships for reasons that have little to do with eligibility:

- **Fragmented portals.** Schemes are spread across state and central websites with different formats, deadlines, and login flows.
- **English-only rules.** Eligibility criteria are written in dense official English that first-generation applicants struggle to parse.
- **Rural connectivity.** Many families are on 2G or unstable networks, where heavy portals simply time out.
- **Middlemen.** Without clear information, families pay intermediaries for work they could do themselves.

## Our Solution

Sahayak runs the whole journey in one place:

1. **Describe yourself** in plain language, by typing into the hero search, or fill in the eligibility form.
2. **Get matched** instantly by a deterministic rules engine that runs in the browser.
3. **Ask questions** in your language to an AI assistant that answers only from verified scheme data and the computed eligibility result.
4. **Track applications** per student, with status (Not Started → Gathering Docs → Applied → Verified).
5. **Find help** at verified partner banks and Cyber Centres, without paying students anything.

---

## Core Features

### 1. Deterministic Eligibility Engine (`src/utils/matcher.js`)

`matchSchemes` is a pure function that runs entirely in the browser. It checks:

| Dimension | What is checked |
|---|---|
| Gender | Scheme gender restriction |
| Category | Caste / category restriction |
| Marital status | Unmarried-only schemes |
| Disability | Minimum disability percentage |
| Income | Maximum family income |
| Stage | Academic stage match (tier level) |
| Stream | Stream match within the tier, including `all` |
| Marks | Minimum and maximum marks within the tier |

Results are sorted by provider rank (state government, then central government, then private), then by maximum award amount, highest first.

> **Not yet checked:** district of residence. Stream is checked only inside each tier, not as a standalone field.

Because matching is deterministic, the same profile always produces the same result. No model is involved in deciding eligibility.

### 2. Zero-Hallucination Multilingual AI Assistant

- **Languages:** English, Bengali (বাংলা), and Hindi (हिन्दी), plus understanding of Banglish and Hinglish (romanised mixed-language input).
- **Grounded answers:** The server builds a `<computed_eligibility>` block from the matcher's output and sends it to Gemini inside the prompt, alongside `<verified_schemes>` and `<verified_partners>`. The model is instructed to answer only from those blocks, so it does not decide eligibility itself or invent deadlines.
- **Short replies:** Chat replies are kept under about 120 words by the prompt rules.
- **Demo mode:** Without `GEMINI_API_KEY`, the endpoint returns canned replies in each supported language, so the app remains usable for demonstrations.

### 3. AI Search-to-Form Extractor

The hero search sends the user's natural-language description to `/api/chat` with `mode: "extract"`. The endpoint returns a JSON profile restricted to a whitelist of keys, with language limited to `en`, `bn`, or `hi`. The result is passed to `/for-you`, where the eligibility form is pre-filled.

- **Gemini path:** Structured JSON output at temperature `0`, capped at 256 tokens.
- **Lite Mode / offline path:** `src/utils/queryParser.js` (`parseStudentQuery`) uses local regular expressions to extract the same kind of profile without any network call.

### 4. Real 2G Lite Mode

- **Detection:** Reads `navigator.connection`. Lite Mode turns on when `saveData` is enabled or `effectiveType` is `2g` or `slow-2g`, and responds to connection changes and going offline.
- **User control:** The choice is stored under `sahayak_lite_mode`, with migration from the legacy `sahayak.liteMode` key.
- **What it strips:** A `lite-mode` class on the root disables animations, transitions, backdrop filters, shadows, and background images, and switches to system fonts.
- **Code splitting:** The `/about` and `/admin` routes are loaded with `React.lazy` inside `Suspense`.
- **Local matching:** Eligibility is computed in the browser, so it does not need a round trip to the server.

### 5. Admin Panel and Live Overrides

- The Admin page (`/admin`) edits scheme data and deadlines. Overrides are saved through `schemeStorage` and `deadline.js`, and the Schemes and For You pages read them back.
- Custom bank and partner entries are saved under `sahayak_partners_custom`.

> **Current limitation:** Admin overrides are stored in the browser's `localStorage`. They are not yet shared across users or devices. Server-side persistence is planned in Phase 2.

### 6. Application Tracker and Confirmation Emails

- Each student has a tracker on `/for-you`, stored in `localStorage` under `sahayak_tracker_<email>`. Statuses are Not Started, Gathering Docs, Applied, and Verified. Only signed-in students can change status.
- A separate per-student reminder list stores scheme IDs locally.
- **Confirmation emails:** `api/subscribe.js` sends a confirmation email through Nodemailer (Gmail service). If `EMAIL_USER` or `EMAIL_PASS` is missing, it runs in demo mode: it returns success with `mode: "demo"` and sends nothing.
- **Scheduled reminders:** Not implemented yet. Planned for Phase 2.

---

## AI Architecture & Security

### Four-Layer Prompt-Injection Defense

| Layer | Control | Where |
|---|---|---|
| 1 | **Input cap:** each message is cut to 400 characters; history keeps the last 4 turns, each capped at 400 characters | `api/chat.js` |
| 2 | **ID scrubber:** 12-digit Aadhaar-style numbers (with optional spaces) are replaced with `[REDACTED_ID]` before reaching the model | `api/chat.js` |
| 3 | **XML sandboxing:** user text is wrapped in `<user_message>`, and verified data in `<verified_schemes>`, `<verified_partners>`, `<computed_eligibility>`, and `<student_profile>`, so instructions in user text are treated as data | `api/chat.js` |
| 4 | **Constrained generation and turn handling:** temperature `0.2` for chat; strict role alternation (`bot`/`assistant` → `model`, others → `user`, duplicate roles dropped, leading model turns skipped, trailing user turn removed); thought parts filtered from responses | `api/chat.js` |

### Three-Model Fallback Chain

Requests try these models in order: **`gemini-3.5-flash-lite` → `gemini-3.8-flash` → `gemini-3.1-flash-lite`**. A 503, 429, or 404 moves to the next model; any other error stops the chain. If every model fails, the endpoint returns 502 with a fixed message.

The server calls the Gemini REST endpoint directly with `fetch`; no SDK is used.

---

## Sustainability & Business Model — "Who Pays?"

Students never pay. Sahayak is funded by three pillars:

1. **CSR & Private Foundations** fund the platform and the scholarship data work.
2. **Admin-verified Cyber Centres (CSCs)** pay a listing fee (stated as ₹30–₹50) for pre-qualified student footfall.
3. **DBT Bank Partnerships** with banks such as SBI, IPPB, and BGVB connect students to verified account and scheme support.

Sahayak does not collect Aadhaar or sensitive identity numbers in its forms. Any 12-digit number typed into chat is redacted before it reaches the AI.

---

## Scalability Roadmap

### Phase 1 — Current MVP
- West Bengal scheme catalogue (12 schemes: 10 state/central West Bengal, 2 private/central)
- Client-side deterministic matcher
- Vercel-compatible serverless AI endpoints
- Verified partner and CSC directory (3 partners in the current data)

### Phase 2 — Statewide Scale
- PostgreSQL / Supabase persistence for Admin overrides, tracker data, and reminders
- Scheduled cron reminders for deadlines
- GPS / Haversine nearby CSC finder
- AI circular and PDF deadline extractor for Admins

### Phase 3 — National Expansion
- Multi-state National Scholarship Portal (NSP) integration
- WhatsApp Bot (Cloud API) for feature-phone and low-literacy families
- Verified CSC operator dashboard

---

## Local Setup

### Install and run

```bash
# 1. Install dependencies
npm install

# 2. Start the API server (Express, default port 5000)
npm run server

# 3. In a second terminal, start the Vite dev server
npm run dev
```

Other scripts: `npm run build` (production build), `npm run preview` (serve the build), `npm run lint` (oxlint).

### Environment Variables

Create `server/.env` with the variables below. Never commit real values.

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | No (demo replies without it) | Enables Gemini responses for chat and extract mode |
| `EMAIL_USER` | No (demo mode without it) | Gmail address used by Nodemailer to send confirmation emails |
| `EMAIL_PASS` | No (demo mode without it) | Gmail app password for `EMAIL_USER` |
| `PORT` | No (default `5000`) | Port for the Express server |

---

## Disclaimer

Sahayak is an **independent guidance tool**. It is not affiliated with or endorsed by the Government of India, the Government of West Bengal, or any listed bank. Eligibility results and AI answers are estimates based on the data available to the app and may be out of date. Students should always **verify final dates, amounts, and criteria** and **submit applications only on the official government portals**.
