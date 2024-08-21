chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'setScreenshotUrl') {
    document.getElementById('screenshotImage').src = request.screenshotUrl;
  }
});