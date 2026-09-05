# Key Jump Plus

Keyboard navigation for Chrome: press a key, type the hint next to any link, button or field, and it gets clicked. No mouse needed.

Key Jump Plus is a fork of [Key Jump](https://github.com/KennethSundqvist/key-jump-browser-extension) by Kenneth Sundqvist (MIT), with letter hints, Shadow DOM support, broader detection of clickable things and Manifest V3 fixes.

## Get the extension

### Original Key Jump on the web stores

- **[Chrome](https://chrome.google.com/webstore/detail/key-jump-keyboard-navigat/afdjhbmagopjlalgcjfclkgobaafamck)**
- **[Firefox](https://addons.mozilla.org/en-US/firefox/addon/key-jump-keyboard-navigation/)**
- **[Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/key-jump-keyboard-navigation/faeejgeaoefhcdlkpkgnlchbbncbmpid)**

### Install Key Jump Plus

The Chrome Web Store link goes here once the listing is approved. Until then, download the zip from the [latest release](https://github.com/davidalmonte9/key-jump-browser-extension/releases/latest), unzip it, open `chrome://extensions`, turn on Developer mode, click Load unpacked and pick the folder.

### Build it yourself

If you want to install the latest version with Manifest V3 support:

1. **Download or clone this repository:**

   ```bash
   git clone https://github.com/davidalmonte9/key-jump-browser-extension.git
   cd key-jump-browser-extension
   ```

2. **Install dependencies and build the extension:**

   ```bash
   npm install
   npm run build
   ```

   This will create a `dist/key_jump_plus-5.5.0.zip` file.

3. **Install in Chrome:**

   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked" or "Load extension"
   - Navigate to the `src` folder and select it
   - The extension should now appear in your extensions list

4. **Alternative: Install from ZIP file:**
   - Extract the `key_jump_plus-5.5.0.zip` file from the `dist` folder
   - In Chrome extensions page, click "Load unpacked"
   - Select the extracted folder

## What's New in This Version

**5.5.0**

- ✅ **Finds more things to click**: elements with ARIA roles like `role="button"`, `tabindex`, `onclick` and `<summary>`, which modern web apps use instead of real links and buttons
- ✅ **Works inside Shadow DOM**: hints are shown for elements inside open shadow roots (web components)
- ✅ **No more duplicate hints** for a link that wraps a single button, and opening it in a new tab uses the link's URL
- ✅ **Hints stay in sync** with the page when it changes while they are shown, and when any scrollable area scrolls, not just the whole page
- ✅ **Letter hints**: choose letter labels (home row first) in the options instead of numbers, so you never need `Enter`
- ✅ **New look**: yellow labels with the part you have typed highlighted
- ✅ **`Backspace`** removes the last typed digit
- ✅ **Options apply immediately** in all open tabs, no reload needed, and can be reset to the defaults
- ✅ **Hints are isolated from page styles** using a shadow root, so they look the same on every site
- ✅ **Firefox Manifest V3 support** with a background script fallback

**5.4.0**

- ✅ **Service Worker**: Background script converted to service worker for better performance
- ✅ **Modern APIs**: Updated to use async/await for better reliability
- ✅ **Future-proof**: Compatible with Chrome's latest extension requirements
- ✅ **Same functionality**: All existing features work exactly the same

## How to use

Press `,` (comma) on your keyboard to show hints for all links, buttons, text fields and other things you can click or focus.

Press `.` (period) instead to open links in new tabs when they are clicked.

Press `Enter` to trigger the hint for the number you've typed. For example when there are 10 links on the page you should press `1` > `Enter` to trigger the first hint.

The hint will be automatically triggered when the number you've typed can't match any other hints. You can disable this in the extension options so you'll aways have to use `Enter` to trigger them.

Prefer letters? Switch **Hint labels** to **Letters** in the options. Labels then use home-row letters like `S`, `A`, `D`, `F`, all the same length, and the hint triggers as soon as you have typed it.

Press `Backspace` to remove the last digit you typed, or `Escape` to clear what you've typed. Press `Escape` again to hide the hints.

Some of these shortcuts can be changed in the extension options.

![](media/screenshots/2.png)

## Development

```bash
npm install
npm run serve-tests
```

This starts a small server with the test page at `http://localhost:1337`. Load the `src` folder as an unpacked extension to try it there, or open `http://localhost:1337/harness`, which runs the content script in a plain page with the extension APIs stubbed out so no installation is needed.

`npm test` runs Prettier, ESLint and `web-ext lint`. `npm run build` creates the zip file in `dist`.

## Permissions required

- **Access your data for all websites:** Allows you to use the extension on all websites.

## Privacy

No data is collected by this extension. You can [view the source code here](https://github.com/davidalmonte9/key-jump-browser-extension/tree/master/src).
