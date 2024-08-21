let screenshots = [];
let currentTab;
let shared = {
  imageDirtyCutAt: 0,
  imageDataURL: null,
  originalScrollTop: 0,
  tab: {
    id: 0,
    url: "",
    title: "",
    hasVscrollbar: false
  }
};

chrome.action.onClicked.addListener((tab) => {
  currentTab = tab;
  shared.tab = {
    id: tab.id,
    url: tab.url,
    title: tab.title
  };

  chrome.tabs.sendMessage(tab.id, { action: "screenshotBegin", shared: shared }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending screenshotBegin message:", chrome.runtime.lastError);
    } else {
      console.log("screenshotBegin message sent successfully");
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background:", request.action);
  switch (request.action) {
    case "screenshotVisibleArea":
      captureVisibleArea(request.shared);
      break;
    case "screenshotEnd":
      finalizeScreenshot(request.shared);
      break;
  }
  sendResponse({received: true});
  return true;
});

function captureVisibleArea(shared) {
  chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error("Error capturing visible tab:", chrome.runtime.lastError);
      return;
    }
    screenshots.push(dataUrl);
    chrome.tabs.sendMessage(currentTab.id, { action: "screenshotScroll", shared: shared }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending screenshotScroll message:", chrome.runtime.lastError);
      } else {
        console.log("screenshotScroll message sent successfully");
      }
    });
  });
}

function finalizeScreenshot(shared) {
  chrome.action.setBadgeBackgroundColor({ color: [0, 128, 255, 255] });
  chrome.action.setBadgeText({ text: "make" });

  mergeScreenshots(screenshots, shared.imageDirtyCutAt, shared.tab.hasVscrollbar)
    .then(result => {
      shared.imageDataURL = result;
      chrome.tabs.sendMessage(currentTab.id, { action: "screenshotReturn", shared: shared }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending screenshotReturn message:", chrome.runtime.lastError);
        } else {
          console.log("screenshotReturn message sent successfully");
        }
      });
      
      chrome.action.setBadgeBackgroundColor({ color: [0, 255, 0, 255] });
      chrome.action.setBadgeText({ text: "✓" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 3000);
    })
    .catch(error => {
      console.error("Error in finalizeScreenshot:", error);
      chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
      chrome.action.setBadgeText({ text: "!" });
    });

  screenshots = [];
}

async function mergeScreenshots(imageDataURLs, imageDirtyCutAt, hasVscrollbar) {
  try {
    const imageBitmaps = await Promise.all(imageDataURLs.map(async dataUrl => {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return createImageBitmap(blob);
    }));

    const totalHeight = imageBitmaps.reduce((sum, img, index) => {
      return sum + (index === imageBitmaps.length - 1 ? imageDirtyCutAt : img.height);
    }, 0);

    const canvas = new OffscreenCanvas(
      imageBitmaps[0].width - (hasVscrollbar ? 15 :
0),
      Math.min(totalHeight, 32766)
    );
    const ctx = canvas.getContext('2d');

    let y = 0;
    imageBitmaps.forEach((img, index) => {
      const isLastImage = index === imageBitmaps.length - 1;
      const height = isLastImage ? imageDirtyCutAt : img.height;
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
    console.error("Error in mergeScreenshots:", error);
    throw error;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('FullPageCapture Pro extension installed.');
});