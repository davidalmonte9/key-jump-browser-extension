// `browser` is the standardised interface for Web Extensions, but Chrome
// doesn't support that yet.
const _browser = typeof browser !== 'undefined' ? browser : chrome

_browser.runtime.onMessage.addListener(async (request) => {
  const url = request?.openUrlInNewTab
  if (typeof url === 'string' && url) {
    try {
      // Get current active tab
      const [currentTab] = await _browser.tabs.query({
        active: true,
        currentWindow: true,
      })

      // Get options using async/await
      const options = await _browser.storage.sync.get('activateNewTab')

      // Create new tab
      await _browser.tabs.create({
        url,
        index: currentTab.index + 1,
        active: options.activateNewTab,
      })
    } catch (error) {
      console.error('Error in background script:', error)
    }
  }
})
