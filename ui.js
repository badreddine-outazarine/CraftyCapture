
//ui.js

function renderCaptureOverlay(imageDataURL, filename) {
  fetch(chrome.runtime.getURL('overlay.html'))
    .then(response => response.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const overlay = doc.body.firstChild;
      const img = overlay.querySelector('#crafty-capture-img');
      const closeButton = overlay.querySelector('#crafty-capture-close');
      const downloadButton = overlay.querySelector('#crafty-capture-download');
      const editButton = overlay.querySelector('#crafty-capture-edit');
      
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