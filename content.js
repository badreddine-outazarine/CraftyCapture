(function() {
    const SCROLL_DELAY = 500;
  
    function screenshotBegin() {
      var scrollNode = document.scrollingElement || document.documentElement;
      window.scrollTo(0, 0);
      setTimeout(function() { 
        chrome.runtime.sendMessage({ action: 'captureNextArea' });
      }, SCROLL_DELAY);
    }
  
    function screenshotScroll() {
      var scrollNode = document.scrollingElement || document.documentElement;
      var scrollTopBeforeScrolling = window.pageYOffset;
      
      window.scrollBy(0, window.innerHeight);
  
      if (window.pageYOffset === scrollTopBeforeScrolling || window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight) {
        chrome.runtime.sendMessage({ action: 'finishCapture' });
      } else {
        setTimeout(function() {
          chrome.runtime.sendMessage({ action: 'captureNextArea' });
        }, SCROLL_DELAY);
      }
    }
  
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      switch (request.action) {
        case "screenshotBegin":
          screenshotBegin();
          break;
        case "screenshotScroll":
          screenshotScroll();
          break;
      }
      sendResponse(true);
    });
  })();