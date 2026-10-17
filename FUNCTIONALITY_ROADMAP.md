# PulseDeck functionality roadmap

The UI theme is intentionally unchanged. Build and verify product behavior before a visual redesign.

## Implemented in this working branch

- Existing organizer, student, and landing-page flows converted from TypeScript to JavaScript/JSX.
- Local demo mode retained for quick demonstrations.
- Quiz creation now asks for a correct answer and optional explanation.
- Student quiz answers receive immediate correctness feedback.
- Supabase quiz answer keys live in a separate owner-protected table and are evaluated by a database function instead of being included in the public activity payload.
- Anonymous per-event browser tokens are stored with activity responses; a database uniqueness constraint prevents the same browser token from submitting more than once to the same activity.

## Next development priorities

### P0 — make core sessions reliable

1. Test and harden create/join/start/pause/close/reopen flows across separate browsers and devices.
2. Add clear empty, loading, offline, and retry states to every data-backed screen.
3. Add a real session lifecycle: draft, live, paused, ended; enforce allowed transitions in the database.
4. Verify every Supabase row-level security policy using organizer, anonymous student, and unrelated signed-in accounts.
5. Add server-side rate limits and abuse controls for questions, votes, and responses. Browser tokens reduce accidental duplicate submissions but are not identity verification.

### P1 — make activities genuinely useful

1. Add a confidence pulse (Understood / Unsure / Need help) that aggregates responses for the teacher.
2. Add quiz score summaries and class accuracy to the teacher's analytics; keep individual answers private unless an identified assessment is explicitly enabled.
3. Add open-text response activities and a moderated word cloud.
4. Add activity scheduling/slide association, response deadlines, and a clear close-results control.
5. Add a reliable CSV export for activity results and session history.

### P2 — AI Lecture Studio

1. Accept PDF and PowerPoint uploads with file-size/type validation.
2. Extract text on the server and preserve page/slide references where possible.
3. Generate editable summaries, key concepts, MCQs with answer keys and explanations, discussion prompts, and activities through a server-side AI provider integration.
4. Require teacher review before AI-generated content is published to students.
5. Show generation errors, source references, and usage limits; never expose provider API keys in browser code.

### P3 — classroom workflow and integrations

1. Add a reliable QR-code generator bundled with the app rather than relying on a third-party image endpoint.
2. Support slide-number/topic association and a presenter companion view beside PowerPoint.
3. Consider a native PowerPoint add-in only after the web companion is stable.
4. Add attendance and team/admin controls only when their privacy and permission model is defined.

## Verification checklist before calling this production-ready

- `npm install` and `npm run build` complete successfully.
- Both SQL migrations apply cleanly to a fresh Supabase project.
- Teacher account can create an event and activity; an unrelated account cannot read or modify it.
- Anonymous students can join only active events, submit valid responses, and cannot read private answer keys or individual response records.
- A scored quiz returns the right result for correct and incorrect answers without exposing its answer key in public activity data.
- A participant cannot submit twice to one activity from the same browser token.
- Closing an event prevents new questions and responses.
- Test with two separate browsers/devices, a narrow phone viewport, keyboard-only navigation, and a screen reader.

## Current limitations

- The cloud backend must be configured by applying both migrations and adding the Supabase URL/public key to `.env.local`.
- Local demo mode uses browser storage and is not shared across devices.
- A browser token can be cleared or changed and does not prove a participant's real identity. Rate limiting, moderation controls, and a privacy review remain necessary before public production use.
- AI file processing, generated content, and a native PowerPoint add-in are planned, not implemented in this branch.
