

class Canvas {
  constructor(width, height) {
    this.canvas = null;
    this.width = width ? width * devicePixelRatio : screenWidth * devicePixelRatio;
    this.height = height ? height * devicePixelRatio : screenHeight * devicePixelRatio;
    this.devicePixelRatio = devicePixelRatio;
    this.createCanvas();
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context = this.canvas.getContext('2d');
  }

  resize(width, height) {
    this.canvas.width = width * devicePixelRatio;
    this.canvas.height = height * devicePixelRatio;
  }

  drawImage({ image, offsetX = 0, offsetY = 0, width, height, canvasX = 0, canvasY = 0, canvasImageWidth, canvasImageHeight }) {
    const scaledWidth = this.devicePixelRatio * width;
    const scaledHeight = this.devicePixelRatio * height;
    this.context.drawImage(
      image,
      this.devicePixelRatio * offsetX,
      this.devicePixelRatio * offsetY,
      scaledWidth,
      scaledHeight,
      canvasX * this.devicePixelRatio,
      canvasY * this.devicePixelRatio,
      canvasImageWidth ? canvasImageWidth * this.devicePixelRatio : scaledWidth,
      canvasImageHeight ? canvasImageHeight * this.devicePixelRatio : scaledHeight
    );
  }

  toDataURL() {
    return this.canvas.toDataURL();
  }

  reset() {
    this.canvas = null;
    this.width = null;
    this.height = null;
  }
}

let fullPageCanvas = null;
let activeTabId = null;
let lastScrollPosition = 0;

const contentScripts = [
  { type: 'script', file: 'js/contentScript.js' }
];

function getActiveTab(callback) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
    callback(tab);
  });
}

function captureVisibleTab() {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
        resolve(dataUrl);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function saveImage(dataUrl, callback = () => {}) {
  chrome.storage.local.set({ image: dataUrl }, () => {
    callback();
    chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
  });
}

function captureVisibleArea() {
  captureVisibleTab()
    .then(saveImage)
    .catch((error) => {
      // Handle error
    });
}

function createImageFromDataUrl(dataUrl, width, height) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.width = width * devicePixelRatio;
      img.height = height * devicePixelRatio;
      img.onload = () => {
        const canvas = new Canvas(width, height);
        canvas.drawImage({
          image: img,
          offsetX: 0,
          offsetY: 0,
          width,
          height
        });
        const newDataUrl = canvas.toDataURL();
        resolve(newDataUrl);
      };
      img.src = dataUrl;
    } catch (error) {
      reject(error);
    }
  });
}

async function captureSelectedArea(request, isCopyToClipboard) {
  let copyToClipboard;
  if (isCopyToClipboard) {
    copyToClipboard = true;
  }
  let selectedArea = request.selectedArea;
  let top = selectedArea.top;
  let left = selectedArea.left;
  let width = selectedArea.width;
  let height = selectedArea.height;

  await chrome.storage.local.set({ selectedArea: request.selectedArea });

  captureVisibleTab()
    .then((dataUrl) => {
      chrome.storage.local.get('selectedArea', (result) => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'handleCropImage',
            data: {
              imageSrc: dataUrl,
              cropData: result,
              isSavetoClipBoard: copyToClipboard
            }
          }, (response) => {
            // Handle response if needed
          });
        });
      });
    })
    .catch((error) => {
      // Handle error
    });
}

async function captureCurrentViewport(data) {
  const { offsetY, scrollHeight, windowHeight } = data;
  lastScrollPosition = offsetY;
  await chrome.storage.local.set({ scrollPageData: data });
}

function notifyFullPageCapturingFinished() {
  chrome.tabs.sendMessage(activeTabId, { action: 'fullPageCapturingFinished' });
  chrome.runtime.sendMessage({ action: 'rb_hide_loader' });
}

function notifyFullPageCapturingFailed() {
  chrome.tabs.sendMessage(activeTabId, { action: 'fullPageCapturingFailed' });
  chrome.runtime.sendMessage({ action: 'rb_hide_loader' });
}

function finishFullPageCapture(dataUrl) {
  saveImage(dataUrl, () => {
    fullPageCanvas = null;
    notifyFullPageCapturingFinished();
  });
}

function captureFullPage(data, isForcefullyFinish = false) {
  const { offsetY, windowHeight } = data;

  captureVisibleTab()
    .then((dataUrl) => {
      const img = new Image();
      img.onload = () => {
        const drawImageParams = {
          image: img,
          width: screenWidth,
          height: windowHeight,
          canvasY: offsetY
        };

        if (isForcefullyFinish) {
          drawImageParams.height = 0;
          drawImageParams.canvasY = lastScrollPosition;
          drawImageParams.canvasImageHeight = lastScrollPosition;
        }

        fullPageCanvas.drawImage(drawImageParams);

        const fullPageDataUrl = fullPageCanvas.toDataURL();

        if (fullPageDataUrl === 'data:,') {
          fullPageCanvas.reset();
          fullPageCanvas = null;
          notifyFullPageCapturingFailed();
          return;
        }

        if (isForcefullyFinish) {
          createImageFromDataUrl(fullPageDataUrl, screenWidth, lastScrollPosition)
            .then((newDataUrl) => {
              finishFullPageCapture(newDataUrl);
            })
            .catch((error) => {
              // Handle error
            });
        } else {
          finishFullPageCapture(fullPageDataUrl);
        }
      };
      img.src = dataUrl;
    })
    .catch((error) => {
      // Handle error
    });
}

async function injectContentScriptsIfNeeded(callback) {
  try {
    await injectContentScriptIfNotLoaded(contentScripts);
    callback();
  } catch (error) {
    // Handle error
  }
}

async function enableAreaSelection() {
  try {
    const tab = await getActiveTab();
    chrome.tabs.sendMessage(tab.id, { action: 'enableAreaSelection' });
  } catch (error) {
    // Handle error
  }
}

async function requestFullPage() {
  try {
    const tab = await getActiveTab();
    activeTabId = tab.id;
    chrome.tabs.sendMessage(tab.id, { action: 'requestFullPage' });
  } catch (error) {
    // Handle error
  }
}

async function checkAccessibility() {
  try {
    const tab = await getActiveTab();
    const result = await executeCodeAsContentScript(tab.id, 'location.href');
    if (!result) {
      chrome.runtime.sendMessage({ action: 'rb_inaccessible_host' });
    }
  } catch (error) {
    // Handle error
  }
}

chrome.runtime.onMessage.addListener(async (request) => {
  try {
    switch (request.action) {
      case 'rb_select_area':
        injectContentScriptsIfNeeded(enableAreaSelection);
        break;
      case 'rb_capture_visible_area':
        injectContentScriptsIfNeeded(captureVisibleArea);
        break;
      case 'rb_capture_full_page':
        injectContentScriptsIfNeeded(requestFullPage);
        break;
      case 'rb_capture_selected_area':
        captureSelectedArea(request);
        break;
      case 'rb_capture_and_copy_selected_area':
        captureSelectedArea(request, 'copy_to_clipboard');
        break;
      case 'capture_current_viewport':
        captureCurrentViewport(request);
        break;
      case 'finish_full_page_capture':
        captureFullPage(request);
        break;
      case 'forcefully_finish_full_page_capture':
        chrome.tabs.sendMessage(activeTabId, { action: 'fullPageCapturingFinished', isForcefully: true });
        captureFullPage(request, true);
        break;
      case 'rb_request_access':
        checkAccessibility();
        break;
    }
  } catch (error) {
    // Handle error
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const data = request.data;

  if (request.action === 'openEditor') {
    saveImage(data);
  } else if (request.action === 'saveToClipBoard') {
    getActiveTab((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: 'copyToClipBoard', imageURL: data });
    });
  } else if (request.action === 'rb_request_access') {
    chrome.storage.local.get((result) => {
      devicePixelRatio = result.devicePixelRatio;
      screenWidth = result.screenWidth;
      screenHeight = result.screenHeight;
    });
  } else if (request.action === 'doPartOfFullPageScreenshot') {
    const screenshotData = request.data;
    chrome.tabs.query({ active: true }, ([{ windowId, id }]) => {
      chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 100 }, (dataUrl) => {
        chrome.storage.local.get('currentImage', (result) => {
          const currentImages = result.currentImage || [];
          currentImages.push(dataUrl);
          chrome.storage.local.set({ currentImage: currentImages }).then(() => {
            chrome.tabs.sendMessage(id || 0, {
              action: 'isDoneScreenshot',
              data: {
                ...screenshotData,
                verticalAnchor: screenshotData.verticalAnchor + 1
              }
            });
          });
        });
      });
    });
  }
});


