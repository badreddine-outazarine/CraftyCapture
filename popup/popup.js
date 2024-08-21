document.getElementById('captureBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({action: "takeScreenshot"});
  window.close();
});