# Screenshot Chrome Extension

## Description
This Chrome extension allows users to capture screenshots of the current tab with a single click. It's a simple, lightweight tool designed to streamline the process of taking and saving screenshots directly from your browser.

## Features
- Capture full-page screenshots of the current tab
- Easy-to-use interface with a single click operation
- Lightweight and fast

## Installation
To install this extension for development:

1. Clone this repository or download the source code.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" by toggling the switch in the top right corner.
4. Click "Load unpacked" and select the directory containing the extension files.

## Usage
1. Click on the extension icon in the Chrome toolbar to capture a screenshot of the current tab.
2. The screenshot will be displayed in a new tab.
3. You can then save or copy the screenshot as needed.

## Project Structure
```
SCREENSHOT APP/
├── images/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── lib/
├── popup/
│   ├── popup.css
│   ├── popup.html
│   └── popup.js
├── background.js
├── content.js
├── manifest.json
├── offscreen.html
├── offscreen.js
├── screenshot.html
└── screenshot.js
```

## Development
To modify or enhance the extension:

1. Edit the relevant files (e.g., `background.js` for core functionality, `popup.html` and `popup.js` for UI changes).
2. After making changes, go to `chrome://extensions/` and click the "Reload" button for this extension.
3. Test your changes thoroughly.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

