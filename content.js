const SCROLL_DELAY = 500;

let captureData = {};
let reverse = [];

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
    case "heartbeat":
      sendResponse(true);
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
  
  blanketStyleSet('position', 'fixed', 'absolute');
  blanketStyleSet('position', 'sticky', 'relative');

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
  
  renderScreenshotOverlay(captureData.finalImageURL, filename);

  blanketStyleRestore('position');
}

function renderScreenshotOverlay(imageDataURL, filename) {
  const overlay = document.createElement('div');
  overlay.id = 'crafty-capture-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
    max-width: 90%;
    max-height: 90%;
    overflow: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  `;

  const img = document.createElement('img');
  img.id = 'crafty-capture-img';
  img.src = imageDataURL;
  img.style.cssText = `
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    margin-bottom: 20px;
  `;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 10px;
  `;

  const closeButton = createButton('Close', () => document.body.removeChild(overlay));
  const downloadButton = createButton('Download', () => {
    const link = document.createElement('a');
    link.href = imageDataURL;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  buttonContainer.appendChild(closeButton);
  buttonContainer.appendChild(downloadButton);

  content.appendChild(img);
  content.appendChild(buttonContainer);
  overlay.appendChild(content);

  document.body.appendChild(overlay);

  img.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData("DownloadURL", `image/png:${filename}.png:${imageDataURL}`);
  });
}

function createButton(text, onClick) {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.cssText = `
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
  `;
  button.addEventListener('click', onClick);
  return button;
}

function generateTimestamp() {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizeFileName(string) {
  return string.replace(/[^a-zA-Z0-9_\-+,;'!?$£@&%()\[\]=]/g, " ").replace(/ +/g, " ");
}

function blanketStyleSet(property, from, to) {
  var els = document.getElementsByTagName('*');
  var el;
  var styles;

  if (property in reverse) {
    blanketStyleRestore(property);
  }
  reverse[property] = [];

  for (var i = 0, l = els.length; i < l; i++) {
    el = els[i];

    if (from == el.style[property]) {
      el.style[property] = to;
      reverse[property].push(function() {
        this.style[property] = from;
      }.bind(el));
    } else {
      styles = getComputedStyle(el);
      if (from == styles.getPropertyValue(property)) {
        el.style[property] = to;
        reverse[property].push(function(){
          this.style[property] = from;
        }.bind(el));
      }
    }
  }
}

function blanketStyleRestore(property) {
  var fx;

  while (fx = reverse[property].shift()) {
    fx();
  }
  delete reverse[property];
}

console.log('Crafty Capture content script loaded.');