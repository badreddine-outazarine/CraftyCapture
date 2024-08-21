var Screenshotter = {
  imageDataURLPartial: [],
  shared: {
    imageDirtyCutAt: 0,
    imageDataURL: 0,
    originalScrollTop: 0,
    tab: {
      id: 0,
      url: "",
      title: "",
      hasVscrollbar: false
    }
  },

  grab: function(e) {
    var self = this;
    this.imageDataURLPartial = [];

    chrome.windows.getCurrent(function(win) {
      chrome.tabs.query({ active: true, windowId: win.id }, function(tabs) {
        var tab = tabs[0];
        self.shared.tab = tab;

        chrome.tabs.sendMessage(self.shared.tab.id, { action: 'screenshotBegin' }, function(response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
          }
          self.captureVisibleArea();
        });
      });
    });
  },

  captureVisibleArea: function() {
    var self = this;
    chrome.tabs.captureVisibleTab(null, { format: "png", quality: 100 }, function(dataUrl) {
      if (dataUrl) {
        self.imageDataURLPartial.push(dataUrl);
        chrome.tabs.sendMessage(self.shared.tab.id, { action: 'screenshotScroll' });
      } else {
        console.error("Failed to capture screenshot");
      }
    });
  },

  finishCapture: function() {
    var self = this;
    this.stitchScreenshots(function(fullPageScreenshot) {
      self.openScreenshotInNewTab(fullPageScreenshot);
    });
  },

  stitchScreenshots: function(callback) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var totalHeight = 0;
    var width = 0;

    this.imageDataURLPartial.forEach((dataUrl, index) => {
      var img = new Image();
      img.onload = () => {
        if (index === 0) {
          width = img.width;
          canvas.width = width;
        }
        totalHeight += img.height;
        canvas.height = totalHeight;
        ctx.drawImage(img, 0, totalHeight - img.height);
        if (index === this.imageDataURLPartial.length - 1) {
          callback(canvas.toDataURL('image/png'));
        }
      };
      img.src = dataUrl;
    });
  },

  openScreenshotInNewTab: function(screenshotUrl) {
    const viewTabUrl = chrome.extension.getURL('screenshot.html');
    chrome.tabs.create({url: viewTabUrl}, (tab) => {
      let listener = function(tabId, changedProps) {
        if (tabId !== tab.id || changedProps.status !== "complete") return;
        chrome.tabs.onUpdated.removeListener(listener);
        
        chrome.tabs.sendMessage(tab.id, {
          action: 'setScreenshotUrl',
          screenshotUrl: screenshotUrl
        });
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  },

  eventManagerInit: function() {
    var self = this;
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      switch (request.action) {
        case "captureNextArea":
          self.captureVisibleArea();
          break;
        case "finishCapture":
          self.finishCapture();
          break;
      }
    });
  }
};

Screenshotter.eventManagerInit();

chrome.browserAction.onClicked.addListener(function(tab) {
  Screenshotter.grab();
});