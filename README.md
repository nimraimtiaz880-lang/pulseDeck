# PulseDeck — Interactive Classroom & Audience Engagement

A responsive web app with a mobile-friendly student join flow and installable PWA metadata. Designed for school classes, universities, training sessions, and online or hybrid teaching.

This project combines the supplied PulseDeck UI into one React + JavaScript/JSX + Vite application. It contains the public product landing page, the organizer dashboard, and the participant/student application.

## Start in VS Code

1. Extract this ZIP and open the **pulsedeck-project** folder in VS Code.
2. Install Node.js 20.19+ or Node.js 22.12+.
3. Open Terminal → New Terminal and run:

   ```bash
   npm install
   npm run dev
   ```
4. Open the local URL printed by Vite (typically `http://localhost:5173`).

Routes:
- `/` — marketing/landing page
- `/dashboard` — organizer workspace
- `/student` — participant interface

The app source uses JavaScript/JSX (not TypeScript) to keep it aligned with a standard React learning path. To make a production build, run `npm run build`. To preview the build, run `npm run preview`.

## Presentation flow (without a backend)

1. Open `/dashboard`. A sample event named **Product Launch Workshop** is preloaded with code **WELCOME**.
2. Show the overview, events, questions, polls, quizzes, surveys, moderation, and analytics views.
3. Create an event and copy its join code.
4. Open `/student` **in a second tab of the same browser on the same device**, enter the code and join.
5. Submit a question from the student tab. The presenter can approve it under Moderation; approved questions appear in the student tab.
6. Create a poll or quiz in the presenter dashboard. Students can respond and the presenter can see the stored responses.
7. Export reports in JSON or CSV from the dashboard.

Local demo data persists through refresh in the same browser via `localStorage`. Demo tabs sync through browser storage events. The `PULSE1` sample is also available in the student interface for an independent demonstration.

**Important:** Local demo mode is not a production backend. Participants using separate devices or browsers cannot share events through `localStorage`. Authentication, secure roles, server-enforced moderation, durable shared data, and real-time multi-device sync require the cloud backend.

## Mobile and presentation workflow

- The responsive student experience works in a mobile browser; the included web manifest allows supported browsers to offer an install-to-home-screen experience. This is a PWA-ready web app, not a native iOS/Android binary.
- Presenters can keep PowerPoint or Google Slides open and run PulseDeck in a second browser window/tab, or share the student join QR/code during a video call. This avoids a required PowerPoint extension, but a native PowerPoint/Google Slides add-in and direct Zoom/Teams integrations are **not implemented** in this starter.
- QR codes are generated locally in the browser using the `qrcode` package.

## Optional Supabase connection

Create a Supabase project. Copy `.env.example` to `.env.local` and enter the project URL and publishable/anon key:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

**Database prerequisite:** The SQL schema and migrations are included under `supabase/migrations/`. Run both migrations in the order described below, then verify row-level security, Realtime subscriptions, and authentication in your own Supabase project. Do not claim Supabase is live until that setup has been configured and tested. Never put the service-role key in a Vite environment variable.

## Technical notes

- React with JavaScript/JSX, Vite, Lucide icons, and an optional Supabase client.
- Original design CSS and authored page components retained and connected.
- Includes a local persistent demo store shared between dashboard and participant tabs.
- In the demo, only the same browser profile/device shares the event state.
- No `node_modules` included. Dependencies are installed with `npm install`.

## Live deployment — required

1. Create a **Supabase** project and enable Email authentication (Authentication → Providers → Email).
2. In its **SQL Editor**, run `supabase/migrations/20261014_pulsedeck.sql` first, then `supabase/migrations/20261016_quiz_scoring.sql`, `supabase/migrations/20261016_quiz_attendance_fix.sql`, and finally `supabase/migrations/20261023_activity_attendance_repair.sql`. The last migration repairs activity visibility/permissions, public aggregate response counts, quiz submission, and participant attendance for existing deployments.
3. Copy `.env.example` to `.env.local`; fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the public project URL and publishable/anon key. **Never use the service-role secret in frontend code.**
4. Run `npm install` followed by `npm run build`. Resolve any errors before publishing.
5. Deploy on **Vercel** or **Netlify** with the same two environment variables defined in the hosting dashboard. The package includes SPA rewrites for `/student` and `/dashboard`.
6. In Supabase Auth → URL Configuration, set Site URL to your published domain, and add the deployed URL to redirect allowlist. For email signup, use a working SMTP provider or test with a confirmed account.
7. In a private window, visit `/dashboard`, create a presenter account and event. From a separate browser/device visit `/student`, enter the event code, submit a question and answer a poll. Approve the question in the presenter moderation view. Confirm analytics and CSV export.

### Production limitations to know

- This application **cannot be considered live without a connected and provisioned Supabase project**; missing environment variables fall back to **local-only demo mode**.
- Live questions must be approved before audience visibility. Activity and response updates use realtime subscriptions with polling fallbacks; student activities refresh every seven seconds and attendance heartbeats run every twenty seconds.
- This starter uses anonymous per-event browser tokens to reduce duplicate responses from one browser, but has **no server-side rate limit or identity verification**; add abuse prevention before public internet traffic.
- Multiple-choice quizzes now support a teacher-defined correct option, optional explanation, and immediate student feedback. The cloud setup requires running both SQL migrations in order. One-response-per-activity is enforced with an anonymous per-event browser token in the database. This reduces duplicate submissions from the same browser, but it is not identity verification and does not replace server-side rate limiting before a public production launch. Team invitations and third-party integrations are not implemented. Attendance counts are based on per-event browser/device tokens and recent heartbeats, not verified student identity.
- Never use real sensitive student data before you review your privacy policy, moderation policy and security requirements.


## Functional upgrade: scored quizzes

- When creating a quiz, enter one option per line, choose the correct option, and optionally add an explanation.
- In local demo mode, the answer key is stored with local demo data and feedback is calculated in the browser. Local mode is for demonstration only.
- With Supabase configured, the correct option and explanation are stored in `quiz_answer_keys`, a separate table with owner-only row-level security. Students submit answers through `submit_quiz_answer`; the database returns correctness and explanation without exposing the answer key through the public activity query.
- Apply `supabase/migrations/20261016_quiz_scoring.sql` after the base migration before testing scored quizzes against Supabase.


## Classroom QR sharing

The live session header opens a large projector-friendly join screen. Teachers can download a high-resolution QR image (PNG) or copy the student join link. If they want the QR inside an existing PowerPoint or Google Slides deck, they can insert the PNG themselves; PulseDeck does not generate a separate PowerPoint file.

QR codes are generated locally using the `qrcode` package and point to the current site's `/student?code=...` route. Use the deployed site URL for classroom use rather than `localhost`.

## Link a presentation to a session

When creating a session, paste a shareable Google Slides URL or a PowerPoint for the web / OneDrive URL into **Presentation link**. PulseDeck stores that link with the session and provides an **Open presentation** link on the session card and in its settings. Set the presentation's sharing permissions so the intended audience can open it. This is a link association, not a native PowerPoint add-in: PulseDeck does not currently control slides or embed polls inside PowerPoint/Google Slides. For cloud-backed projects, run `supabase/migrations/20261016_event_presentations.sql` in the Supabase SQL editor to add the optional `presentation_url` column; fresh installs also include the column in the main schema migration.

## Simplified teacher home

The home screen prioritizes three tasks: create a session, open a session, and review results. Detailed tools remain available in the sidebar. Sessions can be created with or without a presentation link.


### Quiz RPC and live attendance migration

For existing Supabase deployments, run `supabase/migrations/20261016_quiz_attendance_fix.sql` in the Supabase SQL Editor after the original schema and quiz scoring migrations. This recreates the quiz RPC using the named parameters expected by the client, adds the optional expected class size, and enables live connected-participant counts. After applying it, reload the schema cache and retest quiz submission.

The teacher's “Present now” number means a participant browser checked in within the last 60 seconds; it is not identity-verified physical attendance. Students should enter their actual name if the teacher needs a recognizable roster.


## Lecture Studio (new)
- Open **Lecture Studio** from the dashboard to upload a `.pptx` or text-based `.pdf`, or paste lecture text.
- Choose summary, quiz, scenario activity, discussion prompts, or a poll. Review/edit and download the draft.
- PowerPoint extraction reads slide text only; image-only/scanned pages and many diagrams require OCR/visual processing.
- Without an AI endpoint, the interface creates a clearly labelled local prototype draft. For real AI generation, deploy `api/lecture/generate.js` (Vercel-style serverless handler) and set `OPENAI_API_KEY` as a server environment variable. Never put that secret in frontend `.env` variables.
- A PowerPoint add-in starter is included in `powerpoint-addin/`. It can read selected text and call the same API after you configure the deployed HTTPS URL. It is a starter requiring configuration/sideloading, not a published one-click installation.

## New dependencies
Run `npm install` after extracting the updated project to install `jszip` and `pdfjs-dist` used for client-side PowerPoint/PDF text extraction.


### Activity visibility and attendance repair (October 23, 2026)

For an existing live deployment, run `supabase/migrations/20261023_activity_attendance_repair.sql` in the Supabase SQL Editor after the base schema, quiz scoring, and attendance migrations. This migration is safe to re-run and keeps Row Level Security enabled. It re-establishes owner/public activity policies, adds the response token column, restores the aggregate results RPC, repairs quiz submission, and creates the participant heartbeat/attendance functions. Then redeploy the updated app so the dashboard polling and visible error messages are included.

If a teacher or student still sees an error, read the exact message shown in the UI and check Supabase SQL Editor → Logs. Do not use the service-role key in the browser.

## PowerPoint integration

The dashboard now includes **PowerPoint Integration** in the sidebar. The companion Office task pane is served from `public/powerpoint-addin/` and its manifest is available at `/powerpoint-addin/manifest.xml`.

### What works
- Read text selected on a PowerPoint slide (when running inside PowerPoint), and append text from multiple slides.
- Paste lecture text when selected-text access is unavailable.
- Create editable local/template drafts for a summary, quiz, scenario, discussion prompts, or poll without requiring an AI API key.
- Copy the draft, or send the slide text and draft to the PulseDeck dashboard using same-origin localStorage handoff.
- Review the imported content and use the dashboard's activity builder to create a live poll, survey, or quiz for the selected event. Quiz answer keys must be reviewed and selected by the teacher.

### Install the Office add-in
1. Deploy the site over HTTPS at the domain configured in `public/powerpoint-addin/manifest.xml`.
2. In PowerPoint, open the Office Add-ins / My Add-ins interface and use the supported manifest upload or sideload option for your Microsoft 365 version.
3. Select the PulseDeck PowerPoint Companion add-in to open its task pane.
4. Select slide text, click **Read selected slide text**, choose a draft type, click **Generate editable draft**, then **Send to PulseDeck dashboard**.
5. Sign in to PulseDeck if prompted, verify the imported content, choose a live session, and publish the activity from the activity builder.

The manifest currently points to `https://pulsedeck0.netlify.app`. If the production site uses another domain, update the URLs in both `public/powerpoint-addin/manifest.xml` and `powerpoint-addin/manifest.xml` before deploying. This add-in uses transparent template-based drafts, not verified AI generation. It does not insert generated text directly into slide shapes, and selected-text access depends on the PowerPoint host and supported Office APIs. Organizational sideloading may require Microsoft 365 administrator approval.
