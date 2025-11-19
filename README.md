# Suno Bulk Downloader
Bulk download all your Suno AI songs with metadata - available as both a Chrome Extension and Node.js script.

## 🎯 Quick Start - Choose Your Version
### Option 1: Chrome Extension (Recommended)
**✅ Easiest** - No token copying, automatic authentication, visual UI
👉 See [`suno-extension/INSTALL.md`](suno-extension/INSTALL.md) for 5-minute setup

### Option 2: Node.js Script
**✅ More control** - Runs standalone, cross-platform
👉 See instructions below

---

# Node.js Script Version
A standalone Node.js script to bulk download all your Suno AI songs with metadata.

## Features
- ✅ Downloads all songs from your Suno library
- ✅ Saves metadata (title, prompt, tags, creation date, etc.)
- ✅ Downloads cover artwork
- ✅ Organizes by project folders (optional)
- ✅ Skips already downloaded files (resume support)
- ✅ Progress tracking and error handling

## Prerequisites
- Node.js installed (v12 or higher)
- A Suno account with songs

## Setup Instructions

### Step 1: Get Your Authentication Token
1. Go to [suno.com](https://suno.com) and log in
2. Open **DevTools** (press `F12` or right-click → Inspect)
3. Go to the **Network** tab
4. Click on "Me" or refresh the page
5. Find any request to `studio-api.prod.suno.com` in the Network list
6. Click on it and scroll to **Request Headers**
7. Copy two values:
   - `authorization: Bearer eyJhbGc...` (copy everything after "Bearer ")
   - `device-id: 06d695d6-...` (copy the UUID value)

### Step 2: Configure the Script
1. Open `suno-downloader.js` in a text editor
2. Find the `CONFIG` section at the top (around line 20)
3. Replace `YOUR_BEARER_TOKEN_HERE` with your Bearer token (without "Bearer ")
4. Replace `YOUR_DEVICE_ID_HERE` with your device ID

Example:
```
javascript
const CONFIG = {
  BEARER_TOKEN: 'eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDExMUFBQSIsImtpZCI6Imluc...',
  DEVICE_ID: '06d695d6-38b7-4a12-a4f3-a68b2f5e818b',
  OUTPUT_DIR: './suno-downloads',
  DOWNLOAD_AUDIO: true,
  DOWNLOAD_IMAGES: true,
  SAVE_METADATA: true,
  ORGANIZE_BY_PROJECT: true,
};
```

### Step 3: Run the Script
`node suno-downloader.js`

Configuration Options
| Option | Default | Description | |--------|---------|-------------| | BEARER_TOKEN | (required) | Your authentication token from browser | | DEVICE_ID | (required) | Your device ID from browser | | OUTPUT_DIR | ./suno-downloads | Where to save downloaded files | | DOWNLOAD_AUDIO | true | Download MP3 files | | DOWNLOAD_IMAGES | true | Download cover images | | SAVE_METADATA | true | Save metadata as JSON files | | ORGANIZE_BY_PROJECT | true | Create folders for each project |

#### Output Structure
With `ORGANIZE_BY_PROJECT: true`
```
suno-downloads/
├── Project Name/
│   ├── Song Title_abc123.mp3
│   ├── Song Title_abc123.jpg
│   └── Song Title_abc123.json
└── Another Project/
    ├── Another Song_def456.mp3
    ├── Another Song_def456.jpg
    └── Another Song_def456.json
```
    
With `ORGANIZE_BY_PROJECT: false`
```
suno-downloads/
├── Song Title_abc123.mp3
├── Song Title_abc123.jpg
├── Song Title_abc123.json
├── Another Song_def456.mp3
└── ...
```

#### Metadata JSON Structure
Each song's metadata is saved as a JSON file containing:

```
{
  "id": "e301b70f-590f-41a5-8411-5e11390e82fd",
  "title": "Song Title",
  "created_at": "2025-11-17T17:24:52.528Z",
  "tags": "instrumental, classical, cinematic",
  "prompt": "Your original prompt text",
  "display_tags": "instrumental, classical, cinematic",
  "duration": 214.96,
  "model_version": "v5",
  "audio_url": "https://cdn1.suno.ai/...",
  "image_url": "https://cdn2.suno.ai/...",
  "is_public": false,
  "play_count": 2,
  "upvote_count": 0,
  "project": {
    "id": "fe2902e7-...",
    "name": "Project Name",
    "description": ""
  }
}
```

##### Resume Support
The script automatically skips files that already exist, so you can:
* Stop and resume downloads anytime
* Re-run to fetch new songs without re-downloading existing ones
* Update metadata by deleting JSON files and re-running

##### Troubleshooting
**"ERROR: Please set your BEARER_TOKEN"**
* You need to update the BEARER_TOKEN and DEVICE_ID in the script configuration
**"API returned status 401" or "403"**
* Your token has expired. Get a fresh token from the browser DevTools
* Tokens typically expire after a few hours
**"ECONNRESET" or network errors**
* Check your internet connection
* The script will skip failed downloads and continue
**No songs found**
* Verify your token is correct
* Make sure you have songs in your Suno library
* Check that you're logged into the correct account
**Token Expiration**
Bearer tokens typically expire after a few hours. If downloads fail with authentication errors:
* Go back to suno.com
* Get a fresh token from DevTools
* Update the script
* Re-run (it will skip already downloaded files)

##### Privacy & Security
* Your token grants access to your Suno account - keep it private!
* Don't share your configured script with others
* Tokens are temporary and expire automatically
* This script only reads your library, it doesn't modify anything on Suno

#### Future Enhancements
**Planned features:**
* Better error handling and retry logic
* Filter by date range or project
* Export to CSV
* Playlist/collection support
* Interactive mode (no config file editing)

#### Support
For issues or questions:
* Check the troubleshooting section above
* Review the console output for specific error messages
* Ensure Node.js is installed: `node --version`

---

**Note**: This is an unofficial tool. Use responsibly and respect Suno's terms of service.