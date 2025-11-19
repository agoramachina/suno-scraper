// Background service worker for Suno Bulk Downloader

const API_BASE = 'https://studio-api.prod.suno.com';
let downloadState = {
  isActive: false,
  shouldCancel: false,
  stats: {
    total: 0,
    downloaded: 0,
    failed: 0,
  },
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startDownload') {
    handleStartDownload(message.config);
  } else if (message.action === 'cancelDownload') {
    downloadState.shouldCancel = true;
  }
});

async function handleStartDownload(config) {
  if (downloadState.isActive) {
    sendMessageToPopup({ type: 'error', error: 'Download already in progress' });
    return;
  }

  downloadState.isActive = true;
  downloadState.shouldCancel = false;
  downloadState.stats = { total: 0, downloaded: 0, failed: 0 };

  try {
    // Get auth token from content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url.includes('suno.com')) {
      throw new Error('Please navigate to suno.com first');
    }

    // Request auth from content script
    const authData = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: 'getAuth' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Could not connect to Suno page. Try refreshing the page.'));
        } else if (response && response.auth) {
          resolve(response.auth);
        } else {
          reject(new Error('Could not get authentication. Try refreshing the page.'));
        }
      });
    });

    // Fetch all songs
    sendMessageToPopup({
      type: 'progress',
      data: { current: 0, total: 0, status: 'Fetching your songs...' }
    });

    const songs = await fetchAllSongs(authData);

    if (downloadState.shouldCancel) {
      resetDownloadState();
      return;
    }

    // Apply filters
    const filteredSongs = filterSongs(songs, config);
    downloadState.stats.total = filteredSongs.length;

    if (filteredSongs.length === 0) {
      throw new Error('No songs found matching your filters');
    }

    sendMessageToPopup({
      type: 'progress',
      data: { current: 0, total: filteredSongs.length, status: 'Starting downloads...' }
    });

    // Download all songs
    for (let i = 0; i < filteredSongs.length; i++) {
      if (downloadState.shouldCancel) {
        break;
      }

      const song = filteredSongs[i];
      await downloadSong(song, config, authData);

      sendMessageToPopup({
        type: 'progress',
        data: {
          current: i + 1,
          total: filteredSongs.length,
          status: `Downloaded: ${song.title}`
        }
      });
    }

    // Send completion message
    sendMessageToPopup({
      type: 'complete',
      data: downloadState.stats
    });

  } catch (error) {
    console.error('Download error:', error);
    sendMessageToPopup({ type: 'error', error: error.message });
  } finally {
    resetDownloadState();
  }
}

async function fetchAllSongs(authData) {
  const allSongs = [];
  let currentPage = 0;
  let hasMore = true;

  while (hasMore && !downloadState.shouldCancel) {
    const url = `${API_BASE}/api/feed/v2?hide_disliked=true&hide_gen_stems=true&hide_studio_clips=true&page=${currentPage}`;

    const response = await fetch(url, {
      headers: {
        'authorization': `Bearer ${authData.token}`,
        'device-id': authData.deviceId,
        'accept': '*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.clips && data.clips.length > 0) {
      allSongs.push(...data.clips);
    }

    hasMore = data.has_more || false;
    currentPage++;

    // Small delay to be nice to the API
    if (hasMore) {
      await sleep(300);
    }
  }

  return allSongs;
}

function filterSongs(songs, config) {
  let filtered = songs;

  if (config.publicOnly) {
    filtered = filtered.filter(song => song.is_public === true);
  } else if (config.privateOnly) {
    filtered = filtered.filter(song => song.is_public === false);
  }

  return filtered;
}

async function downloadSong(song, config, authData) {
  const songTitle = sanitizeFilename(song.title || `Untitled_${song.id}`);
  const projectName = config.organizeByProject && song.project
    ? sanitizeFilename(song.project.name || 'Unnamed_Project')
    : '';

  const baseName = `${songTitle}_${song.id}`;
  const folderPath = projectName ? `suno-downloads/${projectName}/` : 'suno-downloads/';

  try {
    // Download audio
    if (config.downloadAudio && song.audio_url) {
      await downloadFile(song.audio_url, `${folderPath}${baseName}.mp3`);
    }

    // Download image
    if (config.downloadImages && song.image_large_url) {
      await downloadFile(song.image_large_url, `${folderPath}${baseName}.jpg`);
    }

    // Save metadata
    if (config.downloadMetadata) {
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

      const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      await downloadFile(url, `${folderPath}${baseName}.json`, true);
      URL.revokeObjectURL(url);
    }

    downloadState.stats.downloaded++;
  } catch (error) {
    console.error(`Error downloading ${song.title}:`, error);
    downloadState.stats.failed++;
  }
}

function downloadFile(url, filename, isBlob = false) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: url,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false,
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(downloadId);
      }
    });
  });
}

function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

function sendMessageToPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup might be closed, that's okay
  });
}

function resetDownloadState() {
  downloadState.isActive = false;
  downloadState.shouldCancel = false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}