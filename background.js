let capturedImages = [];
let activeTab;
let captureData = {
  cutoffPoint: 0,
  finalImageURL: null,
  initialScrollPosition: 0,
  tabInfo: {
    id: 0,
    url: "",
    title: "",
    hasScrollbar: false
  }
};

chrome.action.onClicked.addListener((tab) => {
  activeTab = tab;
  captureData.tabInfo = {
    id: tab.id,
    url: tab.url,
    title: tab.title
  };

  chrome.tabs.sendMessage(tab.id, { action: "initializeCapture", captureData: captureData }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error initializing capture:", chrome.runtime.lastError);
    } else {
      console.log("Capture initialization message sent successfully");
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background:", request.action);
  switch (request.action) {
    case "captureVisibleArea":
      performVisibleAreaCapture(request.captureData);
      break;
    case "finalizeCapture":
      completeCaptureProcess(request.captureData);
      break;
  }
  sendResponse({received: true});
  return true;
});

function performVisibleAreaCapture(captureData) {
  chrome.tabs.captureVisibleTab(null, { format: "png", quality: 100 }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error("Error capturing visible tab:", chrome.runtime.lastError);
      return;
    }
    capturedImages.push(dataUrl);
    chrome.tabs.sendMessage(activeTab.id, { action: "scrollPage", captureData: captureData }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending scroll message:", chrome.runtime.lastError);
      } else {
        console.log("Scroll message sent successfully");
      }
    });
  });
}

function completeCaptureProcess(captureData) {
  chrome.action.setBadgeBackgroundColor({ color: [0, 128, 255, 255] });
  chrome.action.setBadgeText({ text: "..." });

  mergeImages(capturedImages, captureData.cutoffPoint, captureData.tabInfo.hasScrollbar)
    .then(result => {
      captureData.finalImageURL = result;
      chrome.tabs.sendMessage(activeTab.id, { action: "displayResult", captureData: captureData }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending display result message:", chrome.runtime.lastError);
        } else {
          console.log("Display result message sent successfully");
        }
      });
      
      chrome.action.setBadgeBackgroundColor({ color: [0, 255, 0, 255] });
      chrome.action.setBadgeText({ text: "✓" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 3000);
    })
    .catch(error => {
      console.error("Error in completeCaptureProcess:", error);
      chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
      chrome.action.setBadgeText({ text: "!" });
    });

  capturedImages = [];
}

async function mergeImages(imageDataURLs, cutoffPoint, hasScrollbar) {
  try {
    const imageBitmaps = await Promise.all(imageDataURLs.map(async dataUrl => {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return createImageBitmap(blob);
    }));

    const totalHeight = imageBitmaps.reduce((sum, img, index) => {
      return sum + (index === imageBitmaps.length - 1 ? cutoffPoint : img.height);
    }, 0);

    const canvas = new OffscreenCanvas(
      imageBitmaps[0].width - (hasScrollbar ? 15 : 0),
      Math.min(totalHeight, 32766)
    );
    const ctx = canvas.getContext('2d');

    let y = 0;
    imageBitmaps.forEach((img, index) => {
      const isLastImage = index === imageBitmaps.length - 1;
      const height = isLastImage ? cutoffPoint : img.height;
      ctx.drawImage(img, 0, 0, canvas.width, height, 0, y, canvas.width, height);
      y += height;
    });

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error in mergeImages:", error);
    throw error;
  }
}

console.log('Crafty Capture extension loaded.');