function renderScreenshotOverlay(imageDataURL, filename) {
    fetch(chrome.runtime.getURL('overlay.html'))
      .then(response => response.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const overlay = doc.body.firstChild;
        const img = overlay.querySelector('#chrome-extension__blipshot-img');
        const dim = overlay.querySelector('#chrome-extension__blipshot-dim');
        const closeButton = overlay.querySelector('#chrome-extension__blipshot-close');
        const downloadButton = overlay.querySelector('#chrome-extension__blipshot-download');
        const editButton = overlay.querySelector('#chrome-extension__blipshot-edit');
        
        img.src = imageDataURL;
        
        document.body.appendChild(overlay);
        
        closeButton.addEventListener('click', () => {
          document.body.removeChild(overlay);
        });
  
        downloadButton.addEventListener('click', () => {
          const link = document.createElement('a');
          link.href = imageDataURL;
          link.download = `${filename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
  
        editButton.addEventListener('click', () => {
          console.log('Edit functionality to be implemented');
        });
        
        img.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData("DownloadURL", `image/png:${filename}.png:${imageDataURL}`);
        });
      });
  }