#!/usr/bin/env node

/**
 * Suno Bulk Downloader
 * Downloads all your Suno songs with metadata
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

const CONFIG = {
  // REQUIRED: Your authorization token from browser DevTools
  // Go to suno.com -> F12 -> Network -> find any API call -> copy the "authorization: Bearer xxx" value
  BEARER_TOKEN: 'YOUR_BEARER_TOKEN_HERE',

  // REQUIRED: Your device ID from browser
  // Find this in the same Network request headers as "device-id"
  DEVICE_ID: 'YOUR_DEVICE_ID_HERE',

  // Output directory for downloads
  OUTPUT_DIR: './suno-downloads',

  // Download options
  DOWNLOAD_AUDIO: true,
  DOWNLOAD_IMAGES: true,
  SAVE_METADATA: true,

  // Organize by project folders
  ORGANIZE_BY_PROJECT: true,
};

// ============================================
// MAIN SCRIPT
// ============================================

class SunoDownloader {
  constructor(config) {
    this.config = config;
    this.baseUrl = 'https://studio-api.prod.suno.com';
    this.stats = {
      totalSongs: 0,
      downloaded: 0,
      failed: 0,
      skipped: 0,
    };
  }

  /**
   * Make an authenticated request to Suno API
   */
  async fetchAPI(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;

    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'authorization': `Bearer ${this.config.BEARER_TOKEN}`,
          'device-id': this.config.DEVICE_ID,
          'accept': '*/*',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      };

      https.get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse JSON: ${e.message}`));
            }
          } else {
            reject(new Error(`API returned status ${res.statusCode}: ${data}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Download a file from URL
   */
  async downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
      // Skip if file already exists
      if (fs.existsSync(outputPath)) {
        this.stats.skipped++;
        resolve(false);
        return;
      }

      const protocol = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(outputPath);

      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      }).on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Delete partial file
        reject(err);
      });

      file.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    });
  }

  /**
   * Sanitize filename to be filesystem-safe
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Fetch all songs from all pages
   */
  async fetchAllSongs() {
    console.log('📡 Fetching your song library...\n');

    const allSongs = [];
    let currentPage = 0;
    let hasMore = true;

    while (hasMore) {
      const endpoint = `/api/feed/v2?hide_disliked=true&hide_gen_stems=true&hide_studio_clips=true&page=${currentPage}`;

      try {
        const response = await this.fetchAPI(endpoint);

        if (response.clips && response.clips.length > 0) {
          allSongs.push(...response.clips);
          console.log(`   Page ${currentPage}: Found ${response.clips.length} songs`);
        }

        hasMore = response.has_more || false;
        currentPage++;

        // Small delay to be nice to the API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`❌ Error fetching page ${currentPage}: ${error.message}`);
        hasMore = false;
      }
    }

    this.stats.totalSongs = allSongs.length;
    console.log(`\n✅ Found ${allSongs.length} total songs\n`);

    return allSongs;
  }

  /**
   * Download a single song with metadata
   */
  async downloadSong(song, index, total) {
    const songTitle = this.sanitizeFilename(song.title || `Untitled_${song.id}`);

    // Determine output directory
    let outputDir = this.config.OUTPUT_DIR;

    if (this.config.ORGANIZE_BY_PROJECT && song.project) {
      const projectName = this.sanitizeFilename(song.project.name || 'Unnamed_Project');
      outputDir = path.join(this.config.OUTPUT_DIR, projectName);
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseName = `${songTitle}_${song.id}`;
    const audioPath = path.join(outputDir, `${baseName}.mp3`);
    const imagePath = path.join(outputDir, `${baseName}.jpg`);
    const metadataPath = path.join(outputDir, `${baseName}.json`);

    console.log(`[${index}/${total}] ${song.title}`);

    try {
      // Download audio
      if (this.config.DOWNLOAD_AUDIO && song.audio_url) {
        const downloaded = await this.downloadFile(song.audio_url, audioPath);
        if (downloaded) {
          console.log(`   ✓ Audio downloaded`);
        } else {
          console.log(`   ⊘ Audio already exists`);
        }
      }

      // Download cover image
      if (this.config.DOWNLOAD_IMAGES && song.image_large_url) {
        const downloaded = await this.downloadFile(song.image_large_url, imagePath);
        if (downloaded) {
          console.log(`   ✓ Image downloaded`);
        } else {
          console.log(`   ⊘ Image already exists`);
        }
      }

      // Save metadata
      if (this.config.SAVE_METADATA) {
        if (!fs.existsSync(metadataPath)) {
          const metadata = {
            id: song.id,
            title: song.title,
            created_at: song.created_at,
            tags: song.metadata?.tags || '',
            prompt: song.metadata?.prompt || '',
            display_tags: song.display_tags || '',
            duration: song.metadata?.duration || 0,
            model_version: song.major_model_version,
            audio_url: song.audio_url,
            image_url: song.image_large_url,
            is_public: song.is_public,
            play_count: song.play_count,
            upvote_count: song.upvote_count,
            project: song.project || null,
          };

          fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
          console.log(`   ✓ Metadata saved`);
        } else {
          console.log(`   ⊘ Metadata already exists`);
        }
      }

      this.stats.downloaded++;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      this.stats.failed++;
    }

    console.log('');
  }

  /**
   * Main download process
   */
  async run() {
    console.log('\n🎵 Suno Bulk Downloader\n');
    console.log('═'.repeat(50));

    // Validate config
    if (this.config.BEARER_TOKEN === 'YOUR_BEARER_TOKEN_HERE') {
      console.error('\n❌ ERROR: Please set your BEARER_TOKEN in the script configuration!\n');
      console.log('To get your token:');
      console.log('1. Go to suno.com and open DevTools (F12)');
      console.log('2. Go to Network tab');
      console.log('3. Refresh the page');
      console.log('4. Find any request to studio-api.prod.suno.com');
      console.log('5. Copy the "authorization: Bearer xxx" value');
      console.log('6. Also copy the "device-id" value\n');
      process.exit(1);
    }

    // Create output directory
    if (!fs.existsSync(this.config.OUTPUT_DIR)) {
      fs.mkdirSync(this.config.OUTPUT_DIR, { recursive: true });
    }

    // Fetch all songs
    const songs = await this.fetchAllSongs();

    if (songs.length === 0) {
      console.log('No songs found. Check your authentication token.');
      return;
    }

    // Download all songs
    console.log('📥 Starting downloads...\n');
    console.log('═'.repeat(50));
    console.log('');

    for (let i = 0; i < songs.length; i++) {
      await this.downloadSong(songs[i], i + 1, songs.length);
    }

    // Print summary
    console.log('═'.repeat(50));
    console.log('\n📊 Download Summary:');
    console.log(`   Total songs: ${this.stats.totalSongs}`);
    console.log(`   Downloaded: ${this.stats.downloaded}`);
    console.log(`   Skipped (already exist): ${this.stats.skipped}`);
    console.log(`   Failed: ${this.stats.failed}`);
    console.log(`\n✅ Done! Files saved to: ${this.config.OUTPUT_DIR}\n`);
  }
}

// ============================================
// RUN THE SCRIPT
// ============================================

const downloader = new SunoDownloader(CONFIG);
downloader.run().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});