# PulseDeck Lecture Studio — Change Log

## Added in this update
- Added Lecture Studio to the workspace navigation and home dashboard.
- Added `.pptx` text extraction in the browser and selectable-text PDF extraction.
- Added teacher-selectable outputs: summary, quiz, scenario activity, discussion prompts, and poll.
- Added editable output and download/copy actions.
- Added optional serverless AI endpoint `api/lecture/generate.js`; API key stays server-side.
- Added a PowerPoint add-in starter under `powerpoint-addin/` that reads selected slide text or accepts pasted content and calls the shared endpoint.
- Updated README with setup, limits, and configuration instructions.

## Important limitations
- The website fallback is a prototype template, not a substitute for a configured AI endpoint.
- PowerPoint add-in needs a real HTTPS domain, domain replacements in its manifest/taskpane JS, Office sideloading, and server-side AI configuration. It reads selected text, not the entire presentation automatically.
- Text extraction does not interpret slide images/diagrams; scanned PDFs need OCR.
- Build and live integration have not been verified in this environment. Run `npm install` and `npm run build`, then test upload and endpoint on your machine.
