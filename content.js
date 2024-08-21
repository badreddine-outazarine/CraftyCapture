const SCROLL_DELAY = 500;

let shared = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request.action);
  switch (request.action) {
    case "screenshotBegin":
      shared = request.shared;
      screenshotBegin(shared);
      break;
    case "screenshotScroll":
      screenshotScroll(request.shared);
      break;
    case "screenshotReturn":
      screenshotReturn(request.shared);
      break;
  }
  sendResponse({received: true}); // Always send a response
  return true; // Indicates that the response is sent asynchronously
});

function screenshotBegin(shared) {
  const scrollNode = document.scrollingElement || document.documentElement;

  if (scrollNode.scrollHeight > 32766) {
    alert("Due to Chrome canvas memory limits, the screenshot will be limited to 32766px height.\n\n");
  }

  shared.originalScrollTop = scrollNode.scrollTop;
  shared.tab.hasVscrollbar = (window.innerHeight < scrollNode.scrollHeight);
  scrollNode.scrollTop = 0;
  
  // Apply style changes
  blanketStyleSet('position', 'fixed', 'absolute');
  blanketStyleSet('position', 'sticky', 'relative');

  setTimeout(() => {
    chrome.runtime.sendMessage({ action: "screenshotVisibleArea", shared: shared }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending screenshotVisibleArea message:", chrome.runtime.lastError);
      } else {
        console.log("screenshotVisibleArea message sent successfully");
      }
    });
  }, 100);
}

function screenshotScroll(shared) {
  const scrollNode = document.scrollingElement || document.documentElement;
  const scrollTopBeforeScrolling = scrollNode.scrollTop;

  scrollNode.scrollTop += window.innerHeight;

  if (scrollNode.scrollTop == scrollTopBeforeScrolling || scrollNode.scrollTop > 32766) {
    shared.imageDirtyCutAt = scrollTopBeforeScrolling % window.innerHeight;
    scrollNode.scrollTop = shared.originalScrollTop;
    chrome.runtime.sendMessage({ action: "screenshotEnd", shared: shared }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending screenshotEnd message:", chrome.runtime.lastError);
      } else {
        console.log("screenshotEnd message sent successfully");
      }
    });
  } else {
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "screenshotVisibleArea", shared: shared }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending screenshotVisibleArea message:", chrome.runtime.lastError);
        } else {
          console.log("screenshotVisibleArea message sent successfully");
        }
      });
    }, SCROLL_DELAY);
  }
}

function screenshotReturn(shared) {
  const d = new Date();
  const timestamp = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}'${pad2(d.getSeconds())}`;
  const filename = `pageshot of '${normalizeFileName(shared.tab.title)}' @ ${timestamp}`;
  
  renderScreenshotOverlay(shared.imageDataURL, filename);

  // Restore original styles
  blanketStyleRestore('position');
}

function pad2(str) {
  return (str + "").padStart(2, "0");
}

function normalizeFileName(string) {
  return string.replace(/[^a-zA-Z0-9_\-+,;'!?$£@&%()\[\]=]/g, " ").replace(/ +/g, " ");
}

function blanketStyleSet(property, from, to) {
  const elements = document.getElementsByTagName('*');
  for (let el of elements) {
    if (getComputedStyle(el).getPropertyValue(property) === from) {
      el.style.setProperty(property, to, 'important');
    }
  }
}

function blanketStyleRestore(property) {
  const elements = document.getElementsByTagName('*');
  for (let el of elements) {
    if (el.style.getPropertyValue(property)) {
      el.style.removeProperty(property);
    }
  }
}

function renderScreenshotOverlay(imageDataURL, filename) {
  const overlay = document.createElement('div');
  overlay.id = 'chrome-extension__blipshot-dim';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 9999;
  `;

  const img = document.createElement('img');
  img.id = 'chrome-extension__blipshot-img';
  img.src = imageDataURL;
  img.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 90%;
    max-height: 90%;
    border: 2px solid white;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
  `;
  img.setAttribute('draggable', 'true');

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 10px;
  `;

  // Close (X) button
  const closeButton = createButton('X', () => {
    document.body.removeChild(overlay);
  });

  // Download button
  const downloadButton = createButton('⬇️', () => {
    const link = document.createElement('a');
    link.href = imageDataURL;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Edit button
  const editButton = createButton('✏️', () => {
    console.log('Edit functionality to be implemented');
    // Placeholder for future edit functionality
  });

  buttonContainer.appendChild(closeButton);
  buttonContainer.appendChild(downloadButton);
  buttonContainer.appendChild(editButton);

  overlay.appendChild(img);
  overlay.appendChild(buttonContainer);
  document.body.appendChild(overlay);

  img.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData("DownloadURL", `image/png:${filename}.png:${imageDataURL}`);
  });
}

function createButton(text, onClick) {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.cssText = `
    background-color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  button.addEventListener('click', onClick);
  return button;
}

// Initialize the content script
console.log('FullPageCapture Pro content script loaded.');