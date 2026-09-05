// `browser` is the standardised interface for Web Extensions, but Chrome
// doesn't support that yet.
const _browser = typeof browser !== 'undefined' ? browser : chrome

// Workaround until dynamic imports are supported in browser extensions in all
// browsers.
const KJ = (window.__KEYJUMP__ = window.__KEYJUMP__ || {})

KJ.defaultOptions = Object.freeze({
  optionsVersion: 4,
  activationShortcut: {
    key: ',',
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
  },
  newTabActivationShortcut: {
    key: '.',
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
  },
  autoTrigger: true,
  activateNewTab: true,
  ignoreWhileInputFocused: true,
  // 'numbers' or 'letters'
  hintLabels: 'numbers',
})

KJ.bootstrapState = async function bootstrapState(state = {}, callback) {
  const [info, storedOptions] = await Promise.all([
    getPlatformInfo(),
    _browser.storage.sync.get(null),
  ])

  state.os = info.os
  state.options = processOptions(storedOptions)

  // Keep the options up to date when they are changed from the options page so
  // the user doesn't have to reload every open tab for the changes to apply.
  _browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') {
      return
    }

    for (const [key, {newValue}] of Object.entries(changes)) {
      if (newValue === undefined) {
        delete state.options[key]
      } else {
        state.options[key] = newValue
      }
    }
  })

  callback(state)
}

function getPlatformInfo() {
  // Not available in content scripts.
  if (_browser.runtime.getPlatformInfo) {
    return _browser.runtime.getPlatformInfo()
  }

  // Only need to know if Mac in the content script.
  const platform = (
    navigator.userAgentData?.platform ||
    navigator.platform ||
    ''
  ).toLowerCase()

  return Promise.resolve({os: platform.includes('mac') ? 'mac' : 'unknown'})
}

function processOptions(options) {
  const defaultOptions = structuredClone(KJ.defaultOptions)

  let saveOptions = false

  if (!options || options.optionsVersion === undefined) {
    saveOptions = true
    options = defaultOptions
  }
  if (options.optionsVersion === 1) {
    saveOptions = true
    options.optionsVersion = 2
    options.activateNewTab = true
  }
  if (options.optionsVersion === 2) {
    saveOptions = true
    options.optionsVersion = 3
    options.ignoreWhileInputFocused = true
  }
  if (options.optionsVersion === 3) {
    saveOptions = true
    options.optionsVersion = 4
    options.hintLabels = 'numbers'
  }
  if (options.optionsVersion !== defaultOptions.optionsVersion) {
    saveOptions = true
    options = defaultOptions
  }

  // Save options even if they have not been changed so if we change the
  // defaults in the future we don't necessarily have to change them for
  // existing users who might have become used to the old default behaviour.
  if (saveOptions) {
    _browser.storage.sync.set(options)
  }

  return options
}
