// DOM Elements
const browseSongsBtn = document.getElementById('browseSongsBtn');
const startBtn = document.getElementById('startBtn');
const cancelBtn = document.getElementById('cancelBtn');
const statusDiv = document.getElementById('status');
const settingsDiv = document.getElementById('settings');
const summaryDiv = document.getElementById('summary');
const statusMessage = document.querySelector('.status-message');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');

// Settings
const downloadAudio = document.getElementById('downloadAudio');
const downloadImages = document.getElementById('downloadImages');
const downloadMetadata = document.getElementById('downloadMetadata');
const organizeByProject = document.getElementById('organizeByProject');
const publicOnly = document.getElementById('publicOnly');
const privateOnly = document.getElementById('privateOnly');

// Summary
const totalSongsEl = document.getElementById('totalSongs');
const downloadedCountEl = document.getElementById('downloadedCount');
const failedCountEl = document.getElementById('failedCount');

let isDownloading = false;

// Load saved settings
chrome.storage.sync.get({
  downloadAudio: true,
  downloadImages: true,
  downloadMetadata: true,
  organizeByProject: true,
  publicOnly: false,
  privateOnly: false,
}, (items) => {
  downloadAudio.checked = items.downloadAudio;
  downloadImages.checked = items.downloadImages;
  downloadMetadata.checked = items.downloadMetadata;
  organizeByProject.checked = items.organizeByProject;
  publicOnly.checked = items.publicOnly;
  privateOnly.checked = items.privateOnly;
});

// Save settings on change
[downloadAudio, downloadImages, downloadMetadata, organizeByProject, publicOnly, privateOnly].forEach(el => {
  el.addEventListener('change', () => {
    chrome.storage.sync.set({
      downloadAudio: downloadAudio.checked,
      downloadImages: downloadImages.checked,
      downloadMetadata: downloadMetadata.checked,
      organizeByProject: organizeByProject.checked,
      publicOnly: publicOnly.checked,
      privateOnly: privateOnly.checked,
    });
  });
});

// Mutual exclusivity for public/private filters
publicOnly.addEventListener('change', () => {
  if (publicOnly.checked) {
    privateOnly.checked = false;
  }
});

privateOnly.addEventListener('change', () => {
  if (privateOnly.checked) {
    publicOnly.checked = false;
  }
});

// Open browse songs page
browseSongsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('browse.html') });
});

// Start download
startBtn.addEventListener('click', async () => {
  if (isDownloading) return;

  isDownloading = true;
  startBtn.disabled = true;
  settingsDiv.classList.add('hidden');
  statusDiv.classList.remove('hidden');
  cancelBtn.classList.remove('hidden');
  summaryDiv.classList.add('hidden');

  statusMessage.textContent = 'Fetching your songs...';
  progressFill.style.width = '0%';
  progressText.textContent = '0 / 0';

  // Get current tab to extract auth info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.includes('suno.com')) {
    alert('Please open suno.com first, then click the extension icon.');
    resetUI();
    return;
  }

  // Send message to background script
  chrome.runtime.sendMessage({
    action: 'startDownload',
    config: {
      downloadAudio: downloadAudio.checked,
      downloadImages: downloadImages.checked,
      downloadMetadata: downloadMetadata.checked,
      organizeByProject: organizeByProject.checked,
      publicOnly: publicOnly.checked,
      privateOnly: privateOnly.checked,
    },
  });
});

// Cancel download
cancelBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'cancelDownload' });
  resetUI();
});

// Listen for progress updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'progress') {
    updateProgress(message.data);
  } else if (message.type === 'complete') {
    showSummary(message.data);
  } else if (message.type === 'error') {
    showError(message.error);
  }
});

function updateProgress(data) {
  const { current, total, status } = data;

  statusMessage.textContent = status || `Downloading songs...`;
  progressText.textContent = `${current} / ${total}`;

  const percentage = total > 0 ? (current / total) * 100 : 0;
  progressFill.style.width = `${percentage}%`;
}

function showSummary(data) {
  isDownloading = false;
  startBtn.disabled = false;
  cancelBtn.classList.add('hidden');
  statusDiv.classList.add('hidden');
  summaryDiv.classList.remove('hidden');

  totalSongsEl.textContent = data.total || 0;
  downloadedCountEl.textContent = data.downloaded || 0;
  failedCountEl.textContent = data.failed || 0;

  setTimeout(() => {
    settingsDiv.classList.remove('hidden');
  }, 3000);
}

function showError(error) {
  isDownloading = false;
  startBtn.disabled = false;
  statusMessage.textContent = `Error: ${error}`;
  statusMessage.style.color = '#f44336';

  setTimeout(() => {
    resetUI();
  }, 3000);
}

function resetUI() {
  isDownloading = false;
  startBtn.disabled = false;
  settingsDiv.classList.remove('hidden');
  statusDiv.classList.add('hidden');
  cancelBtn.classList.add('hidden');
  summaryDiv.classList.add('hidden');
  statusMessage.style.color = '#555';
}