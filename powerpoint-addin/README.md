# PulseDeck PowerPoint add-in starter

This is a development starter, not a production-published add-in. Replace `YOUR-PULSEDECK-DOMAIN` in `manifest.xml` and `taskpane.js` with the HTTPS domain where you host PulseDeck and the task-pane files. The static taskpane files must be hosted at `/powerpoint-addin/`.

## Development
1. Deploy the PulseDeck web app and `/api/lecture/generate` endpoint over HTTPS. Configure `OPENAI_API_KEY` on the server (never in browser variables).
2. Host this folder at `https://YOUR-DOMAIN/powerpoint-addin/`.
3. Replace placeholder domain values in manifest and JS.
4. In PowerPoint, use the Office add-ins developer/sideload workflow supported by your version to load `manifest.xml`. For school-wide use, your Microsoft 365 administrator can deploy the add-in centrally.
5. Select text on a slide, click Read selected text, then generate. This starter reads selected text; it does not automatically ingest every slide in the deck.

Before production, validate manifest compatibility, hosting, authentication, privacy, and permissions for your organization's Microsoft 365 setup.
