// imageProcessor.js (Web Worker)
self.onmessage = async function(e) {
    if (e.data.action === 'mergeScreenshots') {
      try {
        const result = await mergeScreenshots(e.data.imageDataURLs, e.data.imageDirtyCutAt, e.data.hasVscrollbar);
        self.postMessage({ result });
      } catch (error) {
        self.postMessage({ error: error.message });
      }
    }
  };
  
  async function mergeScreenshots(imageDataURLs, imageDirtyCutAt, hasVscrollbar) {
    const bitmaps = await Promise.all(imageDataURLs.map(async dataUrl => {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return createImageBitmap(blob);
    }));
  
    const totalHeight = bitmaps.reduce((sum, bitmap, index) => {
      return sum + (index === bitmaps.length - 1 ? imageDirtyCutAt : bitmap.height);
    }, 0);
  
    const canvas = new OffscreenCanvas(
      bitmaps[0].width - (hasVscrollbar ? 15 : 0),
      Math.min(totalHeight, 32766)
    );
    const ctx = canvas.getContext('2d');
  
    let y = 0;
    bitmaps.forEach((bitmap, index) => {
      const isLastImage = index === bitmaps.length - 1;
      const height = isLastImage ? imageDirtyCutAt : bitmap.height;
      ctx.drawImage(bitmap, 0, 0, canvas.width, height, 0, y, canvas.width, height);
      y += height;
    });
  
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }