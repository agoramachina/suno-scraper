# 🎵 Suno Bulk Downloader - Chrome Extension
A Chrome extension to bulk download all your Suno AI songs with metadata directly from your browser.

## Features
- ✅ **One-Click Download** - No need to manually copy auth tokens
- ✅ **Automatic Authentication** - Uses your existing Suno session
- ✅ **Bulk Download** - Downloads all your songs at once
- ✅ **Complete Metadata** - Saves title, prompt, tags, creation date, and more
- ✅ **Cover Artwork** - Downloads high-resolution cover images
- ✅ **Project Organization** - Optionally organize by project folders
- ✅ **Smart Filtering** - Filter by public/private songs
- ✅ **Resume Support** - Automatically skips already downloaded files
- ✅ **Progress Tracking** - Real-time progress updates

## Installation
### Step 1: Download the Extension
1. Download or clone this repository
2. Navigate to the `suno-extension` folder

### Step 2: Create Icon Files
The extension needs icon files. You can either:

**Option A: Create simple placeholder icons**
* Run this in the suno-extension directory: `mkdir -p icons`
* Create a simple 128x128 PNG icon (use any image editor)
* Save as: `icons/icon128.png`
* Then resize to create: `icons/icon48.png` and `icons/icon16.png`

**Option B: Use online icon generator**
- Go to https://www.favicon-generator.org/
- Upload any music/download icon image
- Download the generated icons
- Place them in the `suno-extension/icons/` folder

### Step 3: Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `suno-extension` folder
5. The extension icon should appear in your Chrome toolbar

## Usage
### Step 1: Navigate to Suno
1. Go to [suno.com](https://suno.com/) and log in
2. Navigate to your library at [suno.com/me](https://suno.com/me)
3. Wait for your songs to load

### Step 2: Start Download
1. Click the **Suno Bulk Downloader** extension icon in your toolbar
2. Configure your download options:
    - ✓ Download Audio (MP3)
    - ✓ Download Cover Images
    - ✓ Save Metadata (JSON)
    - ✓ Organize by Project
    - Filter by public/private songs (optional)
3. Click **Start Download**

### Step 3: Monitor Progress
- Watch the progress bar in the extension popup
- Files will be saved to your browser's default download folder
- Check `chrome://downloads/` to see all downloads

### Step 4: Access Your Files
Files are saved to: `Downloads/suno-downloads/`

**With project organization:**

```
Downloads/suno-downloads/
├── Project Name/
│   ├── Song Title_abc123.mp3
│   ├── Song Title_abc123.jpg
│   └── Song Title_abc123.json
└── Another Project/
    └── ...
```

**Without project organization:**

```
Downloads/suno-downloads/
├── Song Title_abc123.mp3
├── Song Title_abc123.jpg
└── Song Title_abc123.json
```

## Download Options Explained

| Option | Description | |--------|-------------| | **Download Audio** | Downloads MP3 files of your songs | | **Download Cover Images** | Downloads high-res cover artwork (JPG) | | **Save Metadata** | Saves detailed metadata as JSON files | | **Organize by Project** | Creates separate folders for each project | | **Public Only** | Only download songs marked as public | | **Private Only** | Only download songs marked as private |

## Metadata Structure

Each song's metadata JSON contains:

```json
{
  "id": "abc123...",
  "title": "Song Title",
  "created_at": "2025-11-18T12:00:00.000Z",
  "tags": "Description of the music style",
  "prompt": "Your original prompt text",
  "display_tags": "genre, style, mood",
  "duration": 214.96,
  "model_version": "v5",
  "audio_url": "https://cdn1.suno.ai/...",
  "image_url": "https://cdn2.suno.ai/...",
  "is_public": false,
  "play_count": 5,
  "upvote_count": 2,
  "project": {
    "id": "project-id",
    "name": "Project Name",
    "description": "Project description"
  }
}
```

## Troubleshooting
### Extension Not Detecting Auth
**Problem:** "Could not get authentication" error
**Solutions:**
1. Make sure you're on `suno.com` (not another site)
2. Refresh the Suno page (Ctrl+R or Cmd+R)
3. Navigate to [suno.com/me](https://suno.com/me) to trigger API calls
4. Try scrolling down to load more songs
5. Close and reopen the extension popup

### No Songs Found
**Problem:** Extension says "No songs found"
**Solutions:**
1. Verify you have songs in your Suno library
2. Check if you're logged into the correct account
3. Disable any public/private filters
4. Try refreshing the page

### Downloads Not Starting
**Problem:** Files aren't downloading
**Solutions:**
1. Check Chrome's download settings: `chrome://settings/downloads`
2. Make sure Chrome has permission to save files
3. Disable any download managers that might interfere
4. Check browser console for errors (F12 → Console tab)

### Duplicate Downloads
**Problem:** Same songs downloading multiple times
**Solutions:**
- Chrome's `conflictAction: 'uniquify'` automatically prevents overwriting
- Files with the same name will get a number suffix (e.g., `song_abc123 (1).mp3`)
- Delete duplicates manually from your downloads folder

### Auth Token Expired
**Problem:** Downloads fail midway
**Solutions:**
1. Refresh the Suno page to get a new token
2. Restart the download
3. Already downloaded files will be skipped

## Privacy & Security
- ✅ The extension only accesses `suno.com` and Suno's CDN
- ✅ Authentication tokens are temporary and never stored permanently
- ✅ No data is sent to any third-party servers
- ✅ All downloads happen directly from Suno's servers to your computer
- ✅ Open source - review the code yourself!

## How It Works

1. **Content Script** (`content.js`):
    - Runs on suno.com pages
    - Intercepts API requests to extract auth tokens
    - Provides auth data to the background script
    
2. **Background Script** (`background.js`):
    - Fetches your song library from Suno API
    - Manages download queue
    - Downloads files using Chrome's download API
    
3. **Popup UI** (`popup.html/js/css`):
    - User interface for configuration
    - Real-time progress updates
    - Download statistics

## Limitations
- Chrome's download API shows each file separately in `chrome://downloads/`
- Large libraries (100+ songs) may take time to download
- Token expiration may interrupt very long downloads (just restart)
- Requires active Suno session in the browser

## Comparison: Extension vs. Script

| Feature | Chrome Extension | Node.js Script | |---------|------------------|----------------| | Setup | ⭐ Easy (just install) | Requires manual token copy | | Auth | ⭐ Automatic | Manual from DevTools | | UI | ⭐ Visual progress | Terminal output | | Resume | ✅ Yes | ✅ Yes | | Portability | Chrome only | Cross-platform |

## Future Enhancements
**Planned features:**
- [ ] Date range filtering
- [ ] Playlist/collection support
- [ ] Export to CSV
- [ ] Batch rename options
- [ ] Download queue management
- [ ] Retry failed downloads
- [ ] Duplicate detection

## Development
### File Structure
```
suno-extension/
├── manifest.json       # Extension configuration
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
├── popup.css           # Popup styling
├── background.js       # Background service worker
├── content.js          # Content script (auth extraction)
├── icons/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # This file
```

### Testing
1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the **Reload** button under Suno Bulk Downloader
4. Test on `suno.com`

### Debugging
- **Popup issues**: Right-click extension icon → Inspect popup
- **Background issues**: `chrome://extensions/` → Inspect service worker
- **Content script issues**: F12 on suno.com → Console tab

## Support
**For issues or questions:**
1. Check the troubleshooting section above
2. Review browser console for errors (F12 → Console)
3. Verify you're using the latest version of Chrome
4. Make sure you're logged into Suno

## License
This is an unofficial tool. Use responsibly and respect Suno's terms of service.

---

**Note**: This extension is not affiliated with Suno AI. It's a community-built tool to help users backup their own content.