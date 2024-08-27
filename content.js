const SCROLL_DELAY = 500;

let captureData = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request.action);
  switch (request.action) {
    case "initializeCapture":
      captureData = request.captureData;
      initializeCapture(captureData);
      break;
    case "scrollPage":
      scrollPage(request.captureData);
      break;
    case "displayResult":
      displayResult(request.captureData);
      break;
  }
  sendResponse({received: true});
  return true;
});

function initializeCapture(captureData) {
  const scrollNode = document.scrollingElement || document.documentElement;

  if (scrollNode.scrollHeight > 32766) {
    alert("Due to Chrome canvas memory limits, the screenshot will be limited to 32766px height.");
  }

  captureData.initialScrollPosition = scrollNode.scrollTop;
  captureData.tabInfo.hasScrollbar = (window.innerHeight < scrollNode.scrollHeight);
  scrollNode.scrollTop = 0;
  
  setStyles('position', 'fixed', 'absolute');
  setStyles('position', 'sticky', 'relative');

  setTimeout(() => {
    chrome.runtime.sendMessage({ action: "captureVisibleArea", captureData: captureData }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending captureVisibleArea message:", chrome.runtime.lastError);
      } else {
        console.log("captureVisibleArea message sent successfully");
      }
    });
  }, 100);
}

function scrollPage(captureData) {
  const scrollNode = document.scrollingElement || document.documentElement;
  const scrollTopBeforeScrolling = scrollNode.scrollTop;

  scrollNode.scrollTop += window.innerHeight;

  if (scrollNode.scrollTop == scrollTopBeforeScrolling || scrollNode.scrollTop > 32766) {
    captureData.cutoffPoint = scrollTopBeforeScrolling % window.innerHeight;
    scrollNode.scrollTop = captureData.initialScrollPosition;
    chrome.runtime.sendMessage({ action: "finalizeCapture", captureData: captureData }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending finalizeCapture message:", chrome.runtime.lastError);
      } else {
        console.log("finalizeCapture message sent successfully");
      }
    });
  } else {
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "captureVisibleArea", captureData: captureData }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending captureVisibleArea message:", chrome.runtime.lastError);
        } else {
          console.log("captureVisibleArea message sent successfully");
        }
      });
    }, SCROLL_DELAY);
  }
}

function displayResult(captureData) {
  const timestamp = generateTimestamp();
  const filename = `crafty_capture_${normalizeFileName(captureData.tabInfo.title)}_${timestamp}`;
  
  renderCaptureOverlay(captureData.finalImageURL, filename);

  restoreStyles('position');
}

function setStyles(property, from, to) {
  const elements = document.getElementsByTagName('*');
  for (let el of elements) {
    if (getComputedStyle(el).getPropertyValue(property) === from) {
      el.style.setProperty(property, to, 'important');
    }
  }
}

function restoreStyles(property) {
  const elements = document.getElementsByTagName('*');
  for (let el of elements) {
    if (el.style.getPropertyValue(property)) {
      el.style.removeProperty(property);
    }
  }
}

function generateTimestamp() {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizeFileName(string) {
  return string.replace(/[^a-zA-Z0-9_\-+,;'!?$£@&%()\[\]=]/g, " ").replace(/ +/g, " ");
}

console.log('Crafty Capture content script loaded.');