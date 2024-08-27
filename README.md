Crafty Capture/
│
├── manifest.json # Extension configuration file
│
├── background.js # Background script for extension logic
│
├── content.js # Content script injected into web pages
│
├── ui.js # (Optional) UI-related functions
│
├── styles.css # CSS styles for the extension UI
│
├── overlay.html # HTML template for screenshot overlay
│
└── images/ # Directory for extension icons
├── icon16.png
├── icon19.png
├── icon38.png
├── icon48.png
└── icon128.png

Key Files and Their Purposes:

1. manifest.json

   - Defines extension metadata, permissions, and script locations
   - Specifies icon paths and extension configuration

2. background.js

   - Handles extension lifecycle events
   - Manages screenshot capture process
   - Communicates with content script
   - Merges captured screenshots

3. content.js

   - Injected into web pages
   - Handles DOM manipulation and scrolling
   - Communicates with background script
   - Renders screenshot overlay

4. ui.js (Optional)

   - Contains UI-related functions
   - May handle overlay creation and user interactions

5. styles.css

   - Defines styles for extension UI elements
   - Styles for screenshot overlay

6. overlay.html

   - HTML template for displaying the captured screenshot
   - Used by content.js to render the overlay

7. images/
   - Contains various sizes of extension icons
   - Used in manifest.json and for extension visuals
