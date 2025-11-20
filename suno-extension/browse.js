// Helper function to escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');

  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme, sunIcon, moonIcon);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateThemeIcon(prefersDark ? 'dark' : 'light', sunIcon, moonIcon);
  }
}

function updateThemeIcon(theme, sunIcon, moonIcon) {
  if (theme === 'dark') {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');

  let newTheme;
  if (!currentTheme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    newTheme = prefersDark ? 'light' : 'dark';
  } else {
    newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  }

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme, sunIcon, moonIcon);
}

// State management
let allSongs = [];
let filteredSongs = [];
let sortStack = [{ field: 'date', direction: 'desc' }];
let selectedSongs = new Set();

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadSongs();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('clearSearch').addEventListener('click', clearSearch);
  document.getElementById('downloadSelectedBtn').addEventListener('click', downloadSelected);
}

// Handle search
function handleSearch() {
  const searchBox = document.getElementById('searchBox');
  const searchInput = document.getElementById('searchInput');

  if (searchInput.value.length > 0) {
    searchBox.classList.add('has-text');
  } else {
    searchBox.classList.remove('has-text');
  }

  applyFiltersAndSort();
}

// Clear search
function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchBox').classList.remove('has-text');
  applyFiltersAndSort();
}

// Load songs from Suno API
async function loadSongs() {
  try {
    // Request auth from content script (same as background.js does)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url.includes('suno.com')) {
      showError('Please navigate to suno.com first');
      return;
    }

    // Get auth data
    const authData = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: 'getAuth' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Could not connect to Suno page. Try refreshing.'));
        } else if (response && response.auth) {
          resolve(response.auth);
        } else {
          reject(new Error('Could not get authentication. Try refreshing.'));
        }
      });
    });

    // Fetch all songs
    allSongs = await fetchAllSongs(authData);
    console.log(`Loaded ${allSongs.length} songs`);

    if (allSongs.length > 0) {
      console.log('Sample song structure:', allSongs[0]);
    }

    applyFiltersAndSort();
  } catch (error) {
    console.error('Error loading songs:', error);
    showError(`Failed to load songs: ${error.message}`);
  }
}

// Fetch all songs from API (paginated)
async function fetchAllSongs(authData) {
  const API_BASE = 'https://studio-api.prod.suno.com';
  const songs = [];
  let currentPage = 0;
  let hasMore = true;

  while (hasMore) {
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
      songs.push(...data.clips);
    }

    hasMore = data.has_more || false;
    currentPage++;

    // Small delay to be nice to the API
    if (hasMore) {
      await sleep(300);
    }
  }

  return songs;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Apply filters and sorting
function applyFiltersAndSort() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();

  // Filter songs
  filteredSongs = allSongs.filter(song => {
    const matchesSearch = !searchTerm ||
      (song.title && song.title.toLowerCase().includes(searchTerm)) ||
      (song.metadata?.tags && song.metadata.tags.toLowerCase().includes(searchTerm)) ||
      (song.display_tags && song.display_tags.toLowerCase().includes(searchTerm)) ||
      (song.project?.name && song.project.name.toLowerCase().includes(searchTerm));

    return matchesSearch;
  });

  // Sort songs
  sortSongs();

  // Update display
  displaySongs();
  updateStats();
}

// Sort songs based on sortStack
function sortSongs() {
  filteredSongs.sort((a, b) => {
    for (const { field, direction } of sortStack) {
      let aVal, bVal;

      switch (field) {
        case 'name':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        case 'playlist':
          aVal = (a.project?.name || '').toLowerCase();
          bVal = (b.project?.name || '').toLowerCase();
          break;
        case 'tags':
          aVal = (a.metadata?.tags || a.display_tags || '').toLowerCase();
          bVal = (b.metadata?.tags || b.display_tags || '').toLowerCase();
          break;
        case 'favorite':
          aVal = a.upvote_count || 0;
          bVal = b.upvote_count || 0;
          break;
        default:
          continue;
      }

      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      else if (aVal < bVal) comparison = -1;

      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
}

// Handle column sort
function handleColumnSort(field) {
  const existingIndex = sortStack.findIndex(s => s.field === field);

  if (existingIndex === 0) {
    // Clicking primary sort: toggle direction
    sortStack[0].direction = sortStack[0].direction === 'asc' ? 'desc' : 'asc';
  } else if (existingIndex > 0) {
    // Clicking a secondary sort: move it to primary position
    const [sortCriterion] = sortStack.splice(existingIndex, 1);
    sortStack.unshift(sortCriterion);
  } else {
    // New sort: add to front with ascending direction
    sortStack.unshift({ field, direction: 'asc' });
  }

  applyFiltersAndSort();
}

// Get sort indicator for a column
function getSortIndicator(field) {
  const sortIndex = sortStack.findIndex(s => s.field === field);

  if (sortIndex !== 0) return '';

  const { direction } = sortStack[sortIndex];
  const primaryArrow = direction === 'asc' ? '↑' : '↓';
  const secondaryArrow = direction === 'asc' ? '↓' : '↑';

  return ` <span class="sort-indicator">${primaryArrow}<sub>${secondaryArrow}</sub></span>`;
}

// Display songs in table
function displaySongs() {
  const tableContent = document.getElementById('tableContent');

  if (filteredSongs.length === 0) {
    tableContent.innerHTML = '<div class="no-results">No songs found</div>';
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th class="checkbox-col">
            <input type="checkbox" id="selectAll" class="select-all-checkbox">
          </th>
          <th class="sortable" onclick="handleColumnSort('name')">Name${getSortIndicator('name')}</th>
          <th class="sortable" onclick="handleColumnSort('date')">Date${getSortIndicator('date')}</th>
          <th class="sortable" onclick="handleColumnSort('playlist')">Project${getSortIndicator('playlist')}</th>
          <th class="sortable" onclick="handleColumnSort('tags')">Tags${getSortIndicator('tags')}</th>
          <th class="sortable" onclick="handleColumnSort('favorite')">Favorites${getSortIndicator('favorite')}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  filteredSongs.forEach((song) => {
    const createdDate = new Date(song.created_at).toLocaleDateString();
    const projectName = song.project?.name || '-';
    const tags = song.metadata?.tags || song.display_tags || '-';
    const favoriteCount = song.upvote_count || 0;
    const isChecked = selectedSongs.has(song.id);

    html += `
      <tr data-id="${escapeHtml(song.id)}">
        <td class="checkbox-col">
          <input type="checkbox" class="song-checkbox" data-id="${escapeHtml(song.id)}" ${isChecked ? 'checked' : ''}>
        </td>
        <td>
          <div class="song-name">
            <a href="https://suno.com/song/${escapeHtml(song.id)}" target="_blank" title="${escapeHtml(song.title)}">
              ${escapeHtml(song.title || 'Untitled')}
            </a>
          </div>
        </td>
        <td class="date">${createdDate}</td>
        <td>${escapeHtml(projectName)}</td>
        <td class="tags" title="${escapeHtml(tags)}">${escapeHtml(tags)}</td>
        <td>
          <div class="favorite-count ${favoriteCount > 0 ? 'has-favorites' : ''}">
            ${favoriteCount > 0 ? '⭐' : ''} ${favoriteCount}
          </div>
        </td>
        <td class="actions">
          <button class="btn-small btn-download" onclick="downloadSong('${escapeHtml(song.id)}')">Download</button>
          ${song.audio_url ? `<button class="btn-small btn-play" onclick="playSong('${escapeHtml(song.audio_url)}')">Play</button>` : ''}
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  tableContent.innerHTML = html;

  // Setup select all checkbox
  const selectAllCheckbox = document.getElementById('selectAll');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', handleSelectAll);
  }

  // Setup individual checkboxes
  document.querySelectorAll('.song-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handleSongCheckbox);
  });
}

// Handle select all checkbox
function handleSelectAll(event) {
  const isChecked = event.target.checked;

  if (isChecked) {
    filteredSongs.forEach(song => selectedSongs.add(song.id));
  } else {
    selectedSongs.clear();
  }

  displaySongs();
  updateDownloadButton();
}

// Handle individual song checkbox
function handleSongCheckbox(event) {
  const songId = event.target.dataset.id;
  const isChecked = event.target.checked;

  if (isChecked) {
    selectedSongs.add(songId);
  } else {
    selectedSongs.delete(songId);
  }

  updateDownloadButton();
}

// Update download button state
function updateDownloadButton() {
  const downloadBtn = document.getElementById('downloadSelectedBtn');
  downloadBtn.disabled = selectedSongs.size === 0;
  downloadBtn.textContent = selectedSongs.size > 0
    ? `Download Selected (${selectedSongs.size})`
    : 'Download Selected';
}

// Update stats display
function updateStats() {
  const statsEl = document.getElementById('stats');
  const total = allSongs.length;
  const filtered = filteredSongs.length;

  if (filtered === total) {
    statsEl.textContent = `${total} songs`;
  } else {
    statsEl.textContent = `${filtered} of ${total} songs`;
  }
}

// Download single song
async function downloadSong(songId) {
  const song = allSongs.find(s => s.id === songId);
  if (!song) return;

  try {
    // Get current settings from storage
    const settings = await new Promise((resolve) => {
      chrome.storage.sync.get({
        downloadAudio: true,
        downloadImages: true,
        downloadMetadata: true,
        organizeByProject: true,
      }, resolve);
    });

    // Send download request to background script
    chrome.runtime.sendMessage({
      action: 'downloadSongs',
      songs: [song],
      config: settings,
    });

    alert('Download started! Check your downloads folder.');
  } catch (error) {
    console.error('Error downloading song:', error);
    alert(`Error: ${error.message}`);
  }
}

// Download selected songs
async function downloadSelected() {
  const songsToDownload = allSongs.filter(song => selectedSongs.has(song.id));

  if (songsToDownload.length === 0) return;

  try {
    // Get current settings from storage
    const settings = await new Promise((resolve) => {
      chrome.storage.sync.get({
        downloadAudio: true,
        downloadImages: true,
        downloadMetadata: true,
        organizeByProject: true,
      }, resolve);
    });

    // Send download request to background script
    chrome.runtime.sendMessage({
      action: 'downloadSongs',
      songs: songsToDownload,
      config: settings,
    });

    alert(`Downloading ${songsToDownload.length} songs! Check your downloads folder.`);
  } catch (error) {
    console.error('Error downloading songs:', error);
    alert(`Error: ${error.message}`);
  }
}

// Play song in new tab
function playSong(audioUrl) {
  window.open(audioUrl, '_blank');
}

// Show error message
function showError(message) {
  const tableContent = document.getElementById('tableContent');
  tableContent.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}
