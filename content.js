// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureScreenshot') {
        html2canvas(document.documentElement, {
            height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
            width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
            scrollY: -window.scrollY,
            scrollX: -window.scrollX
        }).then(canvas => {
            sendResponse({screenshot: canvas.toDataURL()});
        });
        return true; // Keeps the message channel open for async response
    }
});