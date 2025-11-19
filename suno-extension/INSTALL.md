# Quick Installation Guide

## 5-Minute Setup

### Step 1: Generate Icons (Optional but Recommended)

1. Open `create-icons.html` in your browser
2. Click each download button to save the icons
3. Create an `icons` folder in the `suno-extension` directory
4. Move all three PNG files into the `icons` folder

**OR** skip this step - the extension will work without icons (just won't have a pretty icon)

### Step 2: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `suno-extension` folder
6. Done! The extension is now installed

### Step 3: Use It

1. Go to [suno.com/me](https://suno.com/me)
2. Click the extension icon in your toolbar
3. Click **Start Download**
4. Check your Downloads folder!

## Troubleshooting Quick Fixes

### "Could not get authentication"
- Refresh the suno.com page
- Scroll down to load your songs
- Make sure you're logged in

### No downloads starting
- Check `chrome://settings/downloads`
- Make sure auto-download is enabled
- Try one song first to test

### Extension not showing
- Check if it's pinned: Click the puzzle icon in Chrome toolbar → Pin "Suno Bulk Downloader"

## Where Are My Files?

Files are saved to: `Downloads/suno-downloads/`

Each song gets:
- `SongTitle_id.mp3` - The audio file
- `SongTitle_id.jpg` - Cover image
- `SongTitle_id.json` - Metadata (prompt, tags, etc.)

---

For full documentation, see [README.md](README.md)