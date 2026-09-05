# Chrome Web Store listing text for Key Jump Plus

Copy each block into the matching field in the developer console.

## Store listing tab

**Summary** (from the manifest, 132 chars max):
Keyboard navigation with hints for links, buttons and fields. No mouse needed. Based on Key Jump by Kenneth Sundqvist.

**Description**:
Press , (comma) and every link, button, text field and other clickable thing on the page gets a small label. Type the label and it is clicked. Press . (period) instead to open links in new tabs. No mouse needed.

Features
- Number or letter hint labels (home-row letters, no Enter needed)
- Finds buttons built from divs (ARIA roles, tabindex, onclick), and elements inside Shadow DOM web components
- Hints stay in sync while the page scrolls or changes
- Backspace to fix a typo, Escape to cancel
- Shortcuts and behaviour can be changed in the options

Key Jump Plus is an open source fork of Key Jump by Kenneth Sundqvist (MIT license).
Source code: https://github.com/davidalmonte9/key-jump-browser-extension

**Category**: Productivity > Tools
**Language**: English

**Store icon**: src/icon128.png
**Screenshots**: media/screenshots/1.png and 2.png (640x400)
**Small promo tile** (optional): media/chrome-web-store/small.png (440x280)

## Privacy tab

**Single purpose description**:
Lets the user click links, buttons and form fields on any web page using only the keyboard, by showing short labels next to them.

**Permission justification, storage**:
Saves the user's own settings (keyboard shortcuts, hint label style, behaviour toggles) using chrome.storage.sync.

**Host permission justification (all sites)**:
The content script must run on every page the user visits in order to find clickable elements and draw the hint labels on top of them. It works entirely inside the page, never sends anything anywhere, and does not read page content for any other purpose.

**Remote code**: No, I am not using remote code.

**Data usage**: tick nothing, the extension collects no data. Certify all three statements.

## Distribution tab

**Visibility**: Unlisted
**Regions**: All regions
