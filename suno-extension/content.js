// Content script that extracts auth tokens from Suno API requests

let authData = {
    token: null,
    deviceId: null,
    lastUpdated: null,
  };
  
  // Intercept fetch requests to capture auth headers
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options] = args;
  
    // Check if this is a Suno API request
    if (typeof url === 'string' && url.includes('studio-api.prod.suno.com')) {
      try {
        const headers = options?.headers || {};
  
        // Extract auth from headers object
        if (typeof headers === 'object') {
          for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase() === 'authorization' && typeof value === 'string') {
              const match = value.match(/Bearer\s+(.+)/i);
              if (match) {
                authData.token = match[1];
                authData.lastUpdated = Date.now();
              }
            } else if (key.toLowerCase() === 'device-id') {
              authData.deviceId = value;
            }
          }
        }
      } catch (e) {
        console.error('Error extracting auth:', e);
      }
    }
  
    return originalFetch.apply(this, args);
  };
  
  // Also intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  
  const xhrHeaders = new WeakMap();
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (typeof url === 'string' && url.includes('studio-api.prod.suno.com')) {
      xhrHeaders.set(this, {});
    }
    return originalOpen.call(this, method, url, ...rest);
  };
  
  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    const headers = xhrHeaders.get(this);
  
    if (headers) {
      if (header.toLowerCase() === 'authorization' && typeof value === 'string') {
        const match = value.match(/Bearer\s+(.+)/i);
        if (match) {
          authData.token = match[1];
          authData.lastUpdated = Date.now();
        }
      } else if (header.toLowerCase() === 'device-id') {
        authData.deviceId = value;
      }
    }
  
    return originalSetRequestHeader.call(this, header, value);
  };
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getAuth') {
      // Check if we have valid auth data
      if (authData.token && authData.deviceId) {
        sendResponse({ auth: authData });
      } else {
        // Try to trigger an API request by checking if we're on the right page
        if (window.location.hostname === 'suno.com') {
          sendResponse({
            error: 'No auth data found. Try refreshing the page or navigating to suno.com/me'
          });
        } else {
          sendResponse({
            error: 'Please navigate to suno.com first'
          });
        }
      }
      return true; // Keep the message channel open for async response
    }
  });
  
  // Try to extract auth from existing requests on page load
  window.addEventListener('load', () => {
    // Monitor for API calls
    console.log('Suno Bulk Downloader: Content script loaded');
  });
  
  // Alternative: Check localStorage/sessionStorage for auth tokens
  function checkStorageForAuth() {
    try {
      // Suno might store auth in localStorage or sessionStorage
      const storage = { ...localStorage, ...sessionStorage };
  
      for (const [key, value] of Object.entries(storage)) {
        try {
          // Look for JWT tokens
          if (typeof value === 'string' && value.match(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
            authData.token = value;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    } catch (e) {
      console.error('Error checking storage:', e);
    }
  }
  
  // Check storage on load
  checkStorageForAuth();
  
  // Periodically check if auth is still valid
  setInterval(() => {
    if (authData.lastUpdated && Date.now() - authData.lastUpdated > 3600000) {
      // Auth is older than 1 hour, might be expired
      console.warn('Suno auth might be expired. Try refreshing the page.');
    }
  }, 60000); // Check every minute