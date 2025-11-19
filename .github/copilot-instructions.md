<!-- Copilot / AI Agent instructions for the suno-scraper repo -->
# Repo overview
This repository contains two sibling implementations for the same goal: bulk-download a user's Suno AI library and save audio, cover images, and full metadata.

- `suno-downloader.js` — standalone Node.js script (CLI). Edit the `CONFIG` object at the top to run locally.
- `suno-extension/` — Chrome extension with `content.js` (auth extraction), `background.js` (download queue & API calls), and `popup.*` UI.

**Key design points**
- The extension uses the browser session to avoid manual token copying; the script requires the user-provided Bearer token + device-id.
- Files are organized either flat or by project folder using `ORGANIZE_BY_PROJECT` (script) or project grouping in the extension.
- Filenames follow the pattern: `SanitizedTitle_<song id>.(mp3|jpg|json)` (see `sanitizeFilename` in `suno-downloader.js`).

## Big-picture architecture & data flow
1. Extension flow: `content.js` (runs on `suno.com`) -> intercepts API requests to extract `authorization` and `device-id` -> forwards to `background.js` -> `background.js` fetches Suno API pages and enqueues downloads via Chrome downloads API -> UI in `popup.js` shows progress.
2. Script flow: `suno-downloader.js` uses the `CONFIG` `BEARER_TOKEN` and `DEVICE_ID` headers to call the paginated endpoint `/api/feed/v2` and iterates pages until `has_more` is false. It downloads `audio_url` and `image_large_url` and writes metadata JSON.

## Important files to reference
- `suno-downloader.js` — config object, `fetchAllSongs()`, `downloadSong()`, `sanitizeFilename()`.
- `suno-extension/manifest.json` — extension permissions and content script match patterns.
- `suno-extension/content.js` — token extraction logic (agent must preserve matching/regex behavior).
- `suno-extension/background.js` — download queue, rate-limiting (300–500ms delays), and Chrome download API usage.
- `suno-extension/popup.js` — UI state and options mapping to background actions.

## Authentication & API specifics (do not change without testing)
- API host: `https://studio-api.prod.suno.com` (used by both implementations).
- Required headers: `authorization: Bearer <JWT>` and `device-id: <UUID>`.
- Main endpoint: `/api/feed/v2?hide_disliked=true&hide_gen_stems=true&hide_studio_clips=true&page=<n>`; responses contain `clips`, `has_more` and `current_page`.

## Developer workflows (how to run & debug)
- Node script: Update `CONFIG.BEARER_TOKEN` and `CONFIG.DEVICE_ID` in `suno-downloader.js`, then run `node suno-downloader.js`.
- Extension: open `chrome://extensions/`, enable Developer Mode, click `Load unpacked` and select `suno-extension/`. Use `chrome://extensions/` → Inspect popup or service worker to debug.
- Debug sites: open `https://suno.com/me` in the same browser profile used for the extension.

## Patterns & conventions agents should follow
- Keep changes minimal and local to a single responsibility (no cross-cutting refactors without tests). The repo is small — prefer surgical edits.
- Preserve the file naming & sanitization behavior (see `sanitizeFilename()`); don't change filename length limits unexpectedly.
- Respect token lifecycle: Bearer tokens expire after a few hours; do not attempt persistent server-side storage of user tokens in the extension.
- Rate limits: maintain the existing small delay (300–500ms) between paginated fetches and when enqueuing multiple downloads to avoid triggering server-side throttling.

## Testing & verification steps (for any change that touches downloads/API)
1. For extension changes: Load unpacked extension and test on `https://suno.com/me`. Verify the popup shows authentication and lists songs. Inspect background service worker console for fetch errors.
2. For script changes: Run `node suno-downloader.js` with a valid token/device-id, verify files appear in `./suno-downloads/` and metadata JSON matches the example in `README.md`.
3. Confirm resumability: re-run after partial download — existing files should be skipped (see `fs.existsSync` checks in the script and Chrome's `conflictAction: 'uniquify'`).

## Do / Don't for AI agents
- DO: Add small, well-documented fixes (typo fixes, better error messages, small robustness improvements). Include unit-like manual test instructions in the PR description.
- DO: Reference the exact file and function name when proposing changes (e.g., "change retry delay in `background.js` loop at line X").
- DON'T: Introduce server-side components or token persistence. This project relies on client-side/session authentication.
- DON'T: Change download filename conventions or storage locations unless the user asks—backwards compatibility matters for users' file systems.

## Quick examples (copyable)
- Script config (top of `suno-downloader.js`):
```
const CONFIG = {
  BEARER_TOKEN: '<paste token here>',
  DEVICE_ID: '<paste device id here>',
  OUTPUT_DIR: './suno-downloads',
  DOWNLOAD_AUDIO: true,
  DOWNLOAD_IMAGES: true,
  SAVE_METADATA: true,
  ORGANIZE_BY_PROJECT: true,
};
```
- Filename example: `My Song Title_fe2902e7-....mp3` (sanitized + `_id`).

## Where to add docs or tests
- Add small usage examples to `README.md` or `suno-extension/README.md` when behavior is changed.
- Keep the extension `INSTALL.md` and the script instructions in the root `README.md` synchronized.

---
If anything above is unclear or you'd like more details (e.g., exact line references to `content.js` or `background.js`), tell me which area you'd like expanded and I will iterate.
