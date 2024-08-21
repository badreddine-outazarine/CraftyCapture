document.addEventListener('DOMContentLoaded', function() {
  const captureBtn = document.getElementById('captureBtn');
  const status = document.getElementById('status');

  captureBtn.addEventListener('click', function() {
    status.textContent = 'Taking screenshot...';
    captureBtn.disabled = true;
    captureBtn.classList.add('opacity-50', 'cursor-not-allowed');

    chrome.runtime.sendMessage({action: 'takeScreenshot'}, function(response) {
      if (response.success) {
        status.textContent = 'Screenshot saved!';
        setTimeout(() => {
          status.textContent = '';
          captureBtn.disabled = false;
          captureBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }, 3000);
      } else {
        status.textContent = 'Error: ' + response.error;
        captureBtn.disabled = false;
        captureBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        console.error('Screenshot error:', response.error);
      }
    });
  });
});
