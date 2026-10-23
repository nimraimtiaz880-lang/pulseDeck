# PulseDeck PowerPoint Companion

This is a Microsoft PowerPoint task-pane add-in hosted with the PulseDeck web app. The dashboard also contains a **PowerPoint Integration** sidebar page with installation steps, slide text import, draft review, and a path to publish activities.

## Included workflows

- Read selected text from the current slide using the Office JavaScript API.
- Append text selected from more than one slide, or paste notes manually.
- Generate editable template drafts for a lecture summary, quiz, scenario, discussion prompts, or class poll.
- Copy the draft or send a source-text + draft handoff to the PulseDeck dashboard.
- Download a handoff JSON file as a fallback if the PowerPoint WebView and browser do not share local storage; import that file from the dashboard's PowerPoint Integration page.
- Create a live poll, survey, or quiz in the dashboard's activity builder. A teacher must verify the content and explicitly choose the correct quiz answer before publishing.

Draft generation is local and template-based. It does not call an AI service or claim that generated material is fact-checked. It does not insert text directly into slide shapes or automatically read every slide; select text on each slide that you want to include.

## Install in PowerPoint

1. Deploy PulseDeck over HTTPS at the domain in `manifest.xml`.
2. Open PowerPoint's Office Add-ins / My Add-ins screen and use the manifest upload/sideload option available in your Office version.
3. Upload `manifest.xml` and launch **PulseDeck PowerPoint Companion**.
4. Select slide text and click **Read selected slide text**.
5. Choose a draft type and click **Generate editable draft**.
6. Click **Send to PulseDeck dashboard**. If handoff storage is isolated by the Office host, click **Download handoff JSON** and import the downloaded file on the dashboard's PowerPoint Integration page.
7. In PulseDeck, sign in, select an active event, click **Turn lecture into a live activity**, review the prompt/options and publish.

## Hosting/domain

The manifest currently points to `https://pulsedeck0.netlify.app`. If the site domain changes, update `IconUrl`, `HighResolutionIconUrl`, `SupportUrl`, `AppDomain`, and `SourceLocation` in both `powerpoint-addin/manifest.xml` and `public/powerpoint-addin/manifest.xml`.

Microsoft 365 organization policies may require administrator approval for sideloading. Validate compatibility with the Office version and tenant before broad distribution.
