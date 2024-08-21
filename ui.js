function renderScreenshotOverlay(imageDataURL, filename) {
    fetch(chrome.runtime.getURL('overlay.html'))
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const overlay = doc.body.firstChild;
        const img = overlay.querySelector('#chrome-extension__blipshot-img');
        const dim = overlay.querySelector('#chrome-extension__blipshot-dim');
        
        img.src = imageDataURL;
        img.setAttribute('download', `${filename}.png`);
        
        document.body.appendChild(overlay);
        
        dim.addEventListener('click', () => {
          document.body.removeChild(overlay);
        });
        
        img.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData("DownloadURL", `image/png:${filename}.png:${imageDataURL}`);
        });
      });
  }