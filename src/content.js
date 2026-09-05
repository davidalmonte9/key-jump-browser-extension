/* globals _browser */
// _browser is defined in bootstrap-state.js

// Initialize

const state = {
  // Since we want to handle the events as soon as possible we inject this
  // extension's content script using `"run_at": "document_start"` which will
  // be before the `document.body` element is available, so we use
  // `document.documentElement` instead as the root element.
  //
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts#run_at
  rootEl: document.documentElement,
  active: false,
  openInNewTab: null,
  hints: [],
  query: '',
  matchingHint: null,
  delayedCleanupCallback: null,
  stopRefreshingHints: null,
  refreshHintsRAF: null,
  refreshHintsTimeout: null,
  renderCache: null,
}

window.__KEYJUMP__.bootstrapState(state, setup)

// Stuff

const classNames = Object.freeze({
  container: 'KEYJUMP',
  hint: 'KEYJUMP_hint',
  active: 'KEYJUMP_active',
  filtered: 'KEYJUMP_filtered',
  match: 'KEYJUMP_match',
  typed: 'KEYJUMP_typed',
})

// The hints are rendered inside a closed shadow root so the page's CSS can't
// affect them and our CSS can't affect the page.
const hintStyles = `
  :host {
    all: initial !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 0 !important;
    height: 0 !important;
    overflow: visible !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
  }

  .${classNames.container} {
    transition: opacity 0.2s;
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    pointer-events: none;
  }

  .${classNames.active} {
    opacity: 1;
  }

  .${classNames.hint} {
    transition: opacity 0.15s;
    position: absolute;
    box-sizing: border-box;
    padding: 2px 5px;
    color: #1c1c1c;
    background: linear-gradient(#fff3a3, #ffe14d);
    border: 1px solid rgba(90, 70, 0, 0.55);
    border-radius: 4px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 1px 3px rgba(0, 0, 0, 0.4);
    font: 600 12px/14px system-ui, -apple-system, 'Segoe UI', Helvetica,
      Arial, sans-serif;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .${classNames.typed} {
    color: #c2410c;
  }

  .${classNames.filtered} .${classNames.hint} {
    opacity: 0;
  }

  .${classNames.filtered} .${classNames.match} {
    opacity: 1;
  }
`

const hintTargetSelector = [
  // Don't search for 'a' to avoid finding elements used only for fragment
  // links (jump to a point in a page) which sometimes mess up the hint
  // numbering or it looks like they can be clicked when they can't.
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type=hidden])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'button:not([disabled])',
  'summary',
  '[contenteditable]:not([contenteditable=false]):not([disabled])',
  // Elements that are made interactive with JavaScript.
  '[onclick]',
  '[tabindex]:not([tabindex^="-"])',
  // ARIA roles for interactive widgets that are usually built from plain
  // elements like div and span.
  '[role=button]',
  '[role=link]',
  '[role=checkbox]',
  '[role=radio]',
  '[role=switch]',
  '[role=tab]',
  '[role=option]',
  '[role=menuitem]',
  '[role=menuitemcheckbox]',
  '[role=menuitemradio]',
  '[role=treeitem]',
  '[role=combobox]',
  '[role=textbox]',
  '[role=searchbox]',
  '[role=slider]',
  // AngularJS 1 click binding.
  '[ng-click]:not([disabled])',
  // GWT Anchor widget class
  // http://www.gwtproject.org/javadoc/latest/com/google/gwt/user/client/ui/Anchor.html
  '.gwt-Anchor',
]
  .map((selector) => `${selector}:not([aria-disabled=true])`)
  .join(',')

function setup() {
  // We want to handle the events as soon as possible so listen for them
  // on `window` because that's where the event propagation starts.
  //
  // We also want to handle the events as soon as possible so use the
  // capturing event phase because it is handled first.
  //
  // http://www.w3.org/TR/uievents/#event-flow
  window.addEventListener('keydown', keyboardEventCallback, true)
  window.addEventListener('keyup', keyboardEventCallback, true)
}

function keyboardEventCallback(event) {
  if (event.repeat) {
    return
  }

  // Events from inside a shadow root are retargeted to the shadow host by the
  // time they reach `window`, so use the composed path to find the element
  // that actually has focus.
  const targetEl = event.composedPath()[0] || event.target

  if (
    state.options.ignoreWhileInputFocused &&
    !state.active &&
    canElementBeTypedIn(targetEl)
  ) {
    return
  }

  if (event.type === 'keydown') {
    handleKeydown(event)
  } else if (event.type === 'keyup') {
    handleKeyup(event)
  }
}

function canElementBeTypedIn(el) {
  if (!el || !el.tagName) {
    return false
  }

  // Unknown input types are treated as text inputs so it's easier to test
  // for the types that we know can't be typed in.
  const typesYouCantTypeIn = [
    'button',
    'checkbox',
    'color',
    'file',
    'image',
    'radio',
    'range',
    'reset',
    'submit',
  ]
  const tagName = el.tagName.toLowerCase()
  const type = (el.type || '').toLowerCase()
  const typeCanBeTypedIn = !typesYouCantTypeIn.includes(type)

  return (
    el.isContentEditable ||
    (!el.readOnly &&
      (tagName === 'textarea' || (tagName === 'input' && typeCanBeTypedIn)))
  )
}

function handleKeydown(event) {
  const isActivationShortcut = doesEventMatchShortcut(
    event,
    state.options.activationShortcut,
  )
  const isNewTabActivationShortcut = doesEventMatchShortcut(
    event,
    state.options.newTabActivationShortcut,
  )

  if (shouldMatchingHintBeTriggered(event)) {
    // The keydown event should only be stopped, the keyup event is used for
    // triggering, because if we focus the target element on keydown there will
    // be a keyup event on the target element and that's annoying to deal with.
    stopKeyboardEvent(event)
  } else if (isActivationShortcut || isNewTabActivationShortcut) {
    handleActivationKey(event)
  } else if (state.active && !eventHasModifierKey(event)) {
    if (event.key === 'Escape') {
      handleEscapeKey(event)
    } else if (event.key === 'Backspace') {
      handleBackspaceKey(event)
    } else {
      const allowedQueryCharacters =
        state.options.hintLabels === 'letters'
          ? letterHintAlphabet
          : '1234567890'

      if (
        event.key.length === 1 &&
        allowedQueryCharacters.includes(event.key.toLowerCase())
      ) {
        handleQueryKey(event)
      }
    }
  }
}

function handleKeyup(event) {
  if (shouldMatchingHintBeTriggered(event)) {
    // Use keyup for triggering, because if we focus the target
    // element on keydown there will be a keyup event on the
    // target element and that's annoying to deal with.
    stopKeyboardEvent(event)
    triggerMatchingHint()
  }
}

function doesEventMatchShortcut(event, shortcut) {
  return (
    event.key === shortcut.key &&
    event.shiftKey === shortcut.shiftKey &&
    event.ctrlKey === shortcut.ctrlKey &&
    event.altKey === shortcut.altKey &&
    event.metaKey === shortcut.metaKey
  )
}

function shouldMatchingHintBeTriggered(event) {
  return !!(event.key === 'Enter' && state.matchingHint)
}

function stopKeyboardEvent(event) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function eventHasModifierKey(event) {
  return !!(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
}

function handleActivationKey(event) {
  const isNewTabActivationShortcut = doesEventMatchShortcut(
    event,
    state.options.newTabActivationShortcut,
  )

  stopKeyboardEvent(event)

  if (state.active) {
    if (state.openInNewTab !== isNewTabActivationShortcut) {
      state.openInNewTab = isNewTabActivationShortcut
    } else {
      deactivateHintMode()
    }
  } else {
    state.openInNewTab = isNewTabActivationShortcut
    activateHintMode()
  }
}

function handleEscapeKey(event) {
  stopKeyboardEvent(event)

  if (state.query) {
    setQuery('')
  } else {
    deactivateHintMode()
  }
}

function handleBackspaceKey(event) {
  if (!state.query) {
    return
  }

  stopKeyboardEvent(event)
  setQuery(state.query.slice(0, -1))
}

function handleQueryKey(event) {
  const newQuery = state.query + event.key.toLowerCase()
  const candidates = state.hints.filter((hint) => hint.id.startsWith(newQuery))

  if (!candidates.length) {
    return
  }

  stopKeyboardEvent(event)
  setQuery(newQuery)

  // When only one hint can still be matched there is no point in waiting for
  // more input. With numbers, if the query is 2 and there are 15 hints then
  // no more hints can be matched by appending another digit (20+), but if
  // the query is 1 then hints 10-15 can still be matched.
  if (
    state.options.autoTrigger &&
    state.matchingHint &&
    candidates.length === 1
  ) {
    triggerMatchingHint()
  }
}

// Sets the query and updates the matching hint and the filtering of the
// rendered hints to match.
function setQuery(query) {
  const candidates = state.hints.filter((hint) => hint.id.startsWith(query))

  if (!query || !candidates.length) {
    state.query = ''
    state.matchingHint = null
    clearFilterFromHints()
    return
  }

  state.query = query
  state.matchingHint = candidates.find((hint) => hint.id === query) || null
  filterHints()
}

function triggerMatchingHint() {
  // Stop refreshing before triggering because the triggering could cause a
  // refresh, for example when triggering a fragment link and the page scrolls,
  // and that breaks the clean-up when deactivating.
  if (state.stopRefreshingHints) {
    state.stopRefreshingHints()
  }

  const {
    matchingHint: {targetEl},
    openInNewTab,
  } = state

  if (shouldElementBeFocused(targetEl)) {
    targetEl.focus()
  } else if (openInNewTab && findLinkToOpenInNewTab(targetEl)) {
    _browser.runtime.sendMessage({
      openUrlInNewTab: findLinkToOpenInNewTab(targetEl).href,
    })
  } else {
    const mouseEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      composed: true,
    })

    targetEl.dispatchEvent(mouseEvent)
  }

  // Deactivation is done after the triggering is complete since it resets the
  // hints stuff in the state, which we need when triggering.
  deactivateHintMode()
}

// Finds the link to open in a new tab for a hint target, which is either the
// target itself or the closest link wrapped around it, for example when a
// button inside a link was hinted.
function findLinkToOpenInNewTab(targetEl) {
  for (let el = targetEl; el; el = getParentElement(el)) {
    if (canLinkBeOpenedInNewTab(el)) {
      return el
    }
  }

  return null
}

function canLinkBeOpenedInNewTab(el) {
  const tagName = el.tagName.toLowerCase()

  if ((tagName !== 'a' && tagName !== 'area') || !el.getAttribute('href')) {
    return false
  }

  // Things like `javascript:` links can't be opened in a new tab, they have to
  // be clicked so the page's JavaScript can handle them.
  return ['http:', 'https:', 'file:', 'ftp:'].includes(el.protocol)
}

function activateHintMode() {
  findHints()

  if (!state.hints.length) {
    return
  }

  state.active = true
  renderHints()
  state.renderCache.containerEl.classList.add(classNames.active)

  // If someone is repeatedly pressing the (de)activation key so fast
  // that the hiding animation won't have time to finish we have to
  // trigger the callback ourselves here.
  if (state.delayedCleanupCallback) {
    state.delayedCleanupCallback()
  }

  startRefreshingHints()
}

function deactivateHintMode() {
  if (state.stopRefreshingHints) {
    state.stopRefreshingHints()
  }

  // We have to wait for the opacity transition to end before we can
  // clean things up.
  state.delayedCleanupCallback = delayedCleanupFactory()
  state.renderCache.containerEl.addEventListener(
    'transitionend',
    state.delayedCleanupCallback,
  )

  state.renderCache.containerEl.classList.remove(classNames.active)

  state.active = false
  state.hints = []
  state.query = ''
  state.matchingHint = null
}

function filterHints() {
  state.renderCache.containerEl.classList.add(classNames.filtered)

  for (const hint of state.hints) {
    const isMatch = hint.id.startsWith(state.query)

    hint.hintEl.classList.toggle(classNames.match, isMatch)
    setHintText(hint, isMatch ? state.query : '')
  }
}

function clearFilterFromHints() {
  state.renderCache.containerEl.classList.remove(classNames.filtered)

  for (const hint of state.hints) {
    hint.hintEl.classList.remove(classNames.match)
    setHintText(hint, '')
  }
}

// Renders the label with the part that has been typed highlighted.
function setHintText(hint, typed) {
  const {hintEl, id} = hint

  hintEl.replaceChildren()

  if (typed) {
    const typedEl = document.createElement('span')
    typedEl.className = classNames.typed
    typedEl.textContent = id.slice(0, typed.length)
    hintEl.appendChild(typedEl)
  }

  hintEl.appendChild(document.createTextNode(id.slice(typed.length)))
}

function shouldElementBeFocused(el) {
  const tagName = el.tagName.toLowerCase()
  const inputType = (el.type || '').toLowerCase()

  // Inputs that should be clicked, like checkbox, can also have their
  // readOnly property set to true, but it does not disable them, and
  // they should still be clicked, so the check has to account for that.
  // TODO: Maybe refactor `canElementBeTypedIn` into something new?

  // Select elements can no longer be opened by using the 'mousedown' event
  // since Chrome implemented Event.isTrusted so now we just focus them instead.
  return (
    tagName === 'select' ||
    (tagName === 'input' && inputType === 'range') ||
    canElementBeTypedIn(el)
  )
}

// Finding hints

function findHints() {
  const targetEls = []

  collectHintTargets(state.rootEl, targetEls)

  const visibleTargetEls = targetEls.filter(isElementVisible)
  const redundantTargetEls = findRedundantTargets(visibleTargetEls)

  const hintTargetEls = visibleTargetEls.filter(
    (el) => !redundantTargetEls.has(el),
  )
  const ids = createHintIds(hintTargetEls.length)

  state.hints = hintTargetEls.map((targetEl, index) => ({
    id: ids[index],
    targetEl,
  }))
}

// Home row first, then the letters that are easiest to reach from it.
const letterHintAlphabet = 'sadfjklewcmpgh'

function createHintIds(count) {
  if (state.options.hintLabels !== 'letters') {
    return Array.from({length: count}, (_, index) => String(index + 1))
  }

  // Use the same length for all labels so no label is a prefix of another,
  // which means a label is triggered as soon as it has been typed in full.
  const base = letterHintAlphabet.length
  let length = 1

  while (base ** length < count) {
    length++
  }

  return Array.from({length: count}, (_, index) => {
    let id = ''

    for (let position = 0, rest = index; position < length; position++) {
      id = letterHintAlphabet[rest % base] + id
      rest = Math.floor(rest / base)
    }

    return id
  })
}

// Collects the hint target elements in document order, including the ones
// inside open shadow roots.
function collectHintTargets(root, targetEls) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)

  for (let el = walker.currentNode; el; el = walker.nextNode()) {
    // The first node is the root itself, which is a document fragment when
    // walking a shadow root.
    if (
      el.nodeType !== Node.ELEMENT_NODE ||
      (state.renderCache && el === state.renderCache.hostEl)
    ) {
      continue
    }

    if (el.matches(hintTargetSelector)) {
      targetEls.push(el)
    }

    if (el.shadowRoot) {
      collectHintTargets(el.shadowRoot, targetEls)
    }
  }
}

// A target that wraps exactly one other target, like a link around a single
// button or a focusable card with a single link in it, would get two hints
// that do the same thing. Only the inner target is kept since clicking it
// also bubbles up to the outer one.
function findRedundantTargets(targetEls) {
  const targetSet = new Set(targetEls)
  const nestedTargetCounts = new Map()

  for (const el of targetEls) {
    const parentTargetEl = findParentTarget(el, targetSet)

    if (parentTargetEl) {
      nestedTargetCounts.set(
        parentTargetEl,
        (nestedTargetCounts.get(parentTargetEl) || 0) + 1,
      )
    }
  }

  const redundantTargetEls = new Set()

  for (const [el, count] of nestedTargetCounts) {
    if (count === 1) {
      redundantTargetEls.add(el)
    }
  }

  return redundantTargetEls
}

function findParentTarget(el, targetSet) {
  for (let parent = getParentElement(el); parent; ) {
    if (targetSet.has(parent)) {
      return parent
    }

    parent = getParentElement(parent)
  }

  return null
}

// Like `parentElement` but also steps out of shadow roots to the host element.
function getParentElement(el) {
  if (el.parentElement) {
    return el.parentElement
  }

  const parentNode = el.parentNode

  if (parentNode && parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return parentNode.host || null
  }

  return null
}

function isElementVisible(el) {
  let rect = el.getBoundingClientRect()

  // Only check if the initial element is in the viewport since it could be
  // positioned outside its parent elements which themselves could be outside
  // the viewport.
  if (!isRectInViewport(rect)) {
    return false
  }

  // These overflow values will hide the overflowing child elements.
  const hidingOverflows = ['hidden', 'clip', 'auto', 'scroll']
  const allowedCollapsedTags = ['html', 'body']

  while (el) {
    const styles = window.getComputedStyle(el)

    if (
      // prettier-ignore
      styles.display === 'none' ||
      styles.visibility === 'hidden' ||
      styles.opacity === '0' ||
      (
        (
          (rect.width <= 0 && hidingOverflows.includes(styles.overflowX)) ||
          (rect.height <= 0 && hidingOverflows.includes(styles.overflowY))
        ) &&
        !allowedCollapsedTags.includes(el.tagName.toLowerCase())
      )
    ) {
      return false
    }

    el = getParentElement(el)

    if (el) {
      rect = el.getBoundingClientRect()
    }
  }

  return true
}

function isRectVisible(rect) {
  // TODO: BUG
  // This will report false even if the element the rect is for has a visible
  // overflow which means that the content is still visible even though the
  // element has 0 width/height.
  return isRectInViewport(rect) && rect.width > 0 && rect.height > 0
}

function isRectInViewport(rect) {
  if (
    !rect ||
    rect.top >= document.documentElement.clientHeight ||
    rect.left >= document.documentElement.clientWidth ||
    rect.bottom <= 0 ||
    rect.right <= 0
  ) {
    return false
  }

  return true
}

// Rendering

function renderHints() {
  if (!state.hints.length) {
    return
  }

  if (!state.renderCache) {
    setupRendering()
  }

  const {renderCache: cache} = state

  const fragment = document.createDocumentFragment()
  const winHeight = document.documentElement.clientHeight

  for (const hint of state.hints) {
    hint.hintEl = cache.hintSourceEl.cloneNode(true)
    setHintText(hint, '')

    fragment.appendChild(hint.hintEl)

    // TODO: Refactor to find the first visible child element instead of rect.
    // We must check both the element rect and styles to see if it is visible.
    const rects = hint.targetEl.getClientRects()
    // If none of the rects are visible use the first rect as a workaround...
    const targetPos =
      Array.from(rects).find(isRectVisible) ||
      rects[0] ||
      hint.targetEl.getBoundingClientRect()
    const hintCharWidth = cache.hintCharWidth * hint.id.length

    const top = Math.max(
      0,
      Math.min(Math.round(targetPos.top), winHeight - cache.hintHeight),
    )
    const left = Math.max(
      0,
      Math.round(targetPos.left - cache.hintWidth - hintCharWidth - 2),
    )

    hint.hintEl.style.top = top + 'px'
    hint.hintEl.style.left = left + 'px'
  }

  cache.containerEl.appendChild(fragment)
}

function setupRendering() {
  const cache = (state.renderCache = {})

  // Use a custom element name so generic page styles for elements like `div`
  // can't target the host, and render the hints in a closed shadow root so
  // page styles can't reach them at all.
  cache.hostEl = document.createElement('keyjump-hints')
  cache.shadowRoot = cache.hostEl.attachShadow({mode: 'closed'})

  const styleEl = document.createElement('style')
  styleEl.textContent = hintStyles
  cache.shadowRoot.appendChild(styleEl)

  cache.containerEl = document.createElement('div')
  cache.containerEl.classList.add(classNames.container)
  cache.shadowRoot.appendChild(cache.containerEl)

  state.rootEl.appendChild(cache.hostEl)

  cache.hintSourceEl = document.createElement('div')
  cache.hintSourceEl.classList.add(classNames.hint)

  const hintDimensionsEl = cache.hintSourceEl.cloneNode(true)
  cache.containerEl.appendChild(hintDimensionsEl)

  cache.hintWidth = hintDimensionsEl.offsetWidth
  hintDimensionsEl.textContent = '0'
  cache.hintHeight = hintDimensionsEl.offsetHeight
  cache.hintCharWidth = hintDimensionsEl.offsetWidth - cache.hintWidth

  cache.containerEl.removeChild(hintDimensionsEl)
}

function removeHints(hints) {
  for (const {hintEl} of hints) {
    if (hintEl && hintEl.parentNode) {
      hintEl.parentNode.removeChild(hintEl)
    }
  }
}

function delayedCleanupFactory() {
  const {hints} = state

  return function delayedCleanup() {
    state.renderCache.containerEl.removeEventListener(
      'transitionend',
      state.delayedCleanupCallback,
    )
    state.delayedCleanupCallback = null

    removeHints(hints)
    state.renderCache.containerEl.classList.remove(classNames.filtered)
  }
}

// Refreshing

// While the hints are shown the page can scroll, resize or change its content
// (menus opening, infinite scrolling, single page app navigation), so watch
// for those things and re-render the hints to match.
function startRefreshingHints() {
  const refreshHints = () => {
    state.refreshHintsRAF = null

    if (!state.active) {
      return
    }

    removeHints(state.hints)
    findHints()

    if (!state.hints.length) {
      deactivateHintMode()
      return
    }

    renderHints()
    setQuery(state.query)
  }

  const scheduleRefresh = () => {
    if (state.refreshHintsRAF === null) {
      state.refreshHintsRAF = requestAnimationFrame(refreshHints)
    }
  }

  const eventHandler = (event) => {
    scheduleRefresh()

    // Sometimes the page change is a bit slow and the refresh has happened
    // before the page changes, so refresh again after a timeout to hopefully
    // catch those cases.
    if (event.type === 'popstate' || event.type === 'hashchange') {
      clearTimeout(state.refreshHintsTimeout)
      state.refreshHintsTimeout = setTimeout(scheduleRefresh, 350)
    }
  }

  // Throttle mutation triggered refreshes since some pages mutate the DOM
  // constantly, for example when animating.
  let lastMutationRefresh = 0
  let mutationRefreshTimeout = null
  const mutationRefreshInterval = 200

  const mutationObserver = new MutationObserver(() => {
    if (mutationRefreshTimeout !== null) {
      return
    }

    const wait = Math.max(
      0,
      lastMutationRefresh + mutationRefreshInterval - Date.now(),
    )

    mutationRefreshTimeout = setTimeout(() => {
      mutationRefreshTimeout = null
      lastMutationRefresh = Date.now()
      scheduleRefresh()
    }, wait)
  })

  // Use the capturing phase for scroll since scroll events don't bubble and we
  // want to know when any scrollable element on the page scrolls.
  document.addEventListener('scroll', eventHandler, true)
  window.addEventListener('resize', eventHandler)
  window.addEventListener('popstate', eventHandler)
  window.addEventListener('hashchange', eventHandler)
  mutationObserver.observe(state.rootEl, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'disabled', 'href', 'open'],
  })

  state.stopRefreshingHints = function stopRefreshingHints() {
    document.removeEventListener('scroll', eventHandler, true)
    window.removeEventListener('resize', eventHandler)
    window.removeEventListener('popstate', eventHandler)
    window.removeEventListener('hashchange', eventHandler)
    mutationObserver.disconnect()

    cancelAnimationFrame(state.refreshHintsRAF)
    state.refreshHintsRAF = null
    clearTimeout(state.refreshHintsTimeout)
    clearTimeout(mutationRefreshTimeout)

    // Removes itself so it can't be called multiple times, and to clean up
    // memory usage.
    state.stopRefreshingHints = null
  }
}
