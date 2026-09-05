// `browser` is the standardised interface for Web Extensions, but Chrome
// doesn't support that yet.
const _browser = typeof browser !== 'undefined' ? browser : chrome

_browser.runtime.onMessage.addListener((request, sender) => {
  const url = request?.openUrlInNewTab

  if (typeof url === 'string' && url) {
    openUrlInNewTab(url, sender.tab).catch((error) => {
      console.error('Key Jump: could not open link in new tab', error)
    })
  }
})

async function openUrlInNewTab(url, senderTab) {
  // The tab the message came from is the most reliable "current" tab. Fall
  // back to querying for the active tab in case the sender is unknown.
  let currentTab = senderTab

  if (!currentTab) {
    ;[currentTab] = await _browser.tabs.query({
      active: true,
      currentWindow: true,
    })
  }

  const {activateNewTab = true} = await _browser.storage.sync.get(
    'activateNewTab',
  )

  const createProperties = {
    url,
    active: activateNewTab,
  }

  if (currentTab) {
    // Open the new tab directly after the current one, and mark it as opened
    // from the current tab so the browser can group them and return to the
    // opener when the new tab is closed.
    createProperties.index = currentTab.index + 1
    createProperties.openerTabId = currentTab.id
    createProperties.windowId = currentTab.windowId
  }

  await _browser.tabs.create(createProperties)
}
