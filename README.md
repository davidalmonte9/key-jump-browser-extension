# Key Jump browser extension

No mouse needed to click on links and stuff.

## Get the extension

### From Web Stores
- **[Chrome](https://chrome.google.com/webstore/detail/key-jump-keyboard-navigat/afdjhbmagopjlalgcjfclkgobaafamck)**
- **[Firefox](https://addons.mozilla.org/en-US/firefox/addon/key-jump-keyboard-navigation/)**
- **[Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/key-jump-keyboard-navigation/faeejgeaoefhcdlkpkgnlchbbncbmpid)**

### Manual Installation (Updated Manifest V3 Version)

If you want to install the latest version with Manifest V3 support:

1. **Download or clone this repository:**
   ```bash
   git clone https://github.com/KennethSundqvist/key-jump-browser-extension.git
   cd key-jump-browser-extension
   ```

2. **Install dependencies and build the extension:**
   ```bash
   npm install
   npm run build
   ```
   This will create a `dist/key_jump_keyboard_navigation-5.4.0.zip` file.

3. **Install in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked" or "Load extension"
   - Navigate to the `src` folder and select it
   - The extension should now appear in your extensions list

4. **Alternative: Install from ZIP file:**
   - Extract the `key_jump_keyboard_navigation-5.4.0.zip` file from the `dist` folder
   - In Chrome extensions page, click "Load unpacked"
   - Select the extracted folder

**Note:** The manual installation gives you the latest Manifest V3 version, while the web store versions may still be on Manifest V2 until they're updated.

## What's New in This Version

This repository has been updated to support **Chrome Manifest V3**, which includes:

- ✅ **Service Worker**: Background script converted to service worker for better performance
- ✅ **Modern APIs**: Updated to use async/await for better reliability
- ✅ **Future-proof**: Compatible with Chrome's latest extension requirements
- ✅ **Same functionality**: All existing features work exactly the same

## How to use

Press `,` (comma) on your keyboard to show hints for all links, buttons, text fields and other things you can click or focus.

Press `.` (period) instead to open links in new tabs when they are clicked.

Press `Enter` to trigger the hint for the number you've typed. For example when there are 10 links on the page you should press `1` > `Enter` to trigger the first hint.

The hint will be automatically triggered when the number you've typed can't match any other hints. You can disable this in the extension options so you'll aways have to use `Enter` to trigger them.

Press `Escape` to hide the hints.

Some of these shortcuts can be changed in the extension options.

![](media/screenshots/2.png)

## Permissions required

- **Access your data for all websites:** Allows you to use the extension on all websites.

## Privacy

No data is collected by this extension. You can [view the source code here](https://github.com/KennethSundqvist/key-jump-browser-extension/tree/master/src).
