// offscreen.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target === 'offscreen' && message.type === 'merge-screenshots') {
      mergeScreenshots(message.data, sendResponse);
      return true;
    }
  });
  
  function mergeScreenshots(screenshots, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to the size of the first screenshot
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height * screenshots.length;
      
      // Draw each screenshot onto the canvas
      screenshots.forEach((screenshot, index) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, index * img.height);
          if (index === screenshots.length - 1) {
            // All screenshots merged, return the result
            callback({mergedImageData: canvas.toDataURL()});
          }
        };
        img.src = screenshot;
      });
    };
    img.src = screenshots[0];
  }