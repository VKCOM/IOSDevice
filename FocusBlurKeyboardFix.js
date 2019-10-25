import { isWKWebView, IOS_NO_KEYBOARD_ALLOWED_OFFSET } from './IOSDetections';

let opener = null;
let fullViewportHeight = 0;
let lastViewportOffset = 0;

export function onOpen() {
  if (!opener) {
    opener = {
      onceBlocked: false,
    };
  }

  if (opener.onceBlocked) {
    opener.opened = true;
  }

  if (!opener.onceBlocked && !opener.opened) {
    opener.onceBlocked = true;

    const activeElement = document.activeElement;

    activeElement.blur();
    activeElement.focus();

    return false;
  }

  opener.opened = true;

  if (window.visualViewport) {
    fullViewportHeight = visualViewport.height;
    lastViewportOffset = 0;

    setTimeout(checkViewport);
    visualViewport.addEventListener('scroll', checkViewport);
    visualViewport.addEventListener('resize', checkViewport);
  }

  return true;
}

export function onClose() {
  if (!opener || (opener.onceBlocked && !opener.opened)) {
    return false;
  }

  if (window.visualViewport) {
    setTimeout(checkViewport);
    visualViewport.removeEventListener('scroll', checkViewport);
    visualViewport.removeEventListener('resize', checkViewport);
  }

  opener = null;
  fullViewportHeight = 0;
  lastViewportOffset = 0;

  return true;
}

function checkViewport() {
  if (visualViewport.height >= fullViewportHeight) {
    return;
  }

  const offset = fullViewportHeight - visualViewport.height;

  if (lastViewportOffset === offset) {
    return;
  }

  if (!isWKWebView && offset < IOS_NO_KEYBOARD_ALLOWED_OFFSET) {
    scrollTo(0, 0);
  } else {
    scrollTo(0, offset);
  }
}
