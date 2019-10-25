import * as EasyFix from './EasyScrollKeyboardFix';
import * as HardFix from './HardScrollKeyboardFix';
import * as FocusBlurFix from './FocusBlurKeyboardFix';

import {
  isIPad, isIPhone, isIOS,
  iosMajor, iosMinor,
  isWKWebView, isScrollBasedViewport,

  isLandscapePhone,
} from './IOSDetections';

let isOpen = false;
let openStarted = false;
let closeStarted = false;
let closingScrollTimer = null;
let closeCallbacks = [];
let openCallbacks = [];
let currentPosition = null;

const easyFix = isScrollBasedViewport && (isIPad || isWKWebView);
const hardFix = isScrollBasedViewport && iosMajor <= 12;

export function onOpen(position = 'default', {
  exitIfStarted = false
} = {}) {
  if (!isIOS || iosMajor < 8) {
    return;
  }

  if (openStarted && exitIfStarted) {
    return;
  }

  if (isOpen) {
    return;
  }

  currentPosition = position;
  openStarted = true;

  if (closingScrollTimer) {
    clearTimeout(closingScrollTimer);
    closingScrollTimer = null;
  }

  if (position === 'bottom') {
    if (isLandscapePhone() || (!easyFix && !hardFix)) {
      if (!FocusBlurFix.onOpen()) {
        return;
      }
    }

    if (!easyFix && hardFix) {
      HardFix.onOpen(position);
    }

    if (easyFix) {
      EasyFix.onOpen();
    }
  } else {
    if (!easyFix && hardFix) {
      HardFix.onOpen(position);
    }
  }

  if (openCallbacks.length) {
    openCallbacks.forEach(fn => fn());
  }

  isOpen = true;
  openStarted = false;
}

export function onClose({ exitIfStarted = false } = {}) {
  if (!isIOS || iosMajor < 8) {
    return;
  }

  if (closeStarted && exitIfStarted) {
    return;
  }

  closeStarted = true;

  if (currentPosition === 'bottom') {
    if (isLandscapePhone() || (!easyFix && !hardFix)) {
      if (!FocusBlurFix.onClose()) {
        return;
      }
    }

    if (!isOpen) {
      return;
    }

    if (!easyFix && hardFix) {
      HardFix.onClose();
    }

    if (easyFix) {
      EasyFix.onClose();
    }
  } else {
    if (!easyFix && hardFix) {
      HardFix.onClose();
    }
  }

  isOpen = false;
  closeStarted = false;
  currentPosition = null;

  if (closingScrollTimer) {
    clearTimeout(closingScrollTimer);
  }

  closingScrollTimer = setTimeout(() => {
    let closingScrollTimer = null;
    scrollTo(0, 0);

    if (closeCallbacks.length) {
      closeCallbacks.forEach(fn => fn());
    }
  }, 10);
}

export function isKeyboardOpen() {
  return isOpen;
}

export function onCloseCallback(fn) {
  if (closeCallbacks.indexOf(fn) === -1) {
    closeCallbacks.push(fn);
  }
}

export function offCloseCallback(fn) {
  const index = closeCallbacks.indexOf(fn);

  if (index !== -1) {
    closeCallbacks.splice(index, 1);
  }
}

export function onOpenCallback(fn) {
  if (openCallbacks.indexOf(fn) === -1) {
    openCallbacks.push(fn);
  }
}

export function offOpenCallback(fn) {
  const index = openCallbacks.indexOf(fn);

  if (index !== -1) {
    openCallbacks.splice(index, 1);
  }
}
