import {
  IPHONE_SAFARI_BOTTOM_BAR,
  IPHONE_X_SAFARI_BOTTOM_BAR,
  IPHONE_KEYBOARD_REJECT_OFFSET,
  IOS_NO_KEYBOARD_ALLOWED_OFFSET,

  isIPad, isIPhone, isIOS,
  iosMajor, iosMinor,
  isWKWebView, isIPhoneX,

  isLandscapePhone,
} from './IOSDetections';

let keyboardSizeH = 0;
let keyboardSizeV = 0;

let ignoreScrollEvent;
let removeListenerTimer;
let lastSmallScrollSize;
let smallKeyboardCount;

let height;
let width;

let currentPosition = '';
let scrollTimerDisabled = false;
let setScrollValue;
let setScrollCount;
let resizeTimer;
let notValidScroll = {};

let lastWindowHeight;
let topAdjust;
let topAnimateAmount;
let topAnimateSpeed = 0;

export function onOpen(position) {
  currentPosition = position;

  scrollTimerDisabled = false;
  ignoreScrollEvent = false;
  lastSmallScrollSize = 0;
  smallKeyboardCount = 0;
  setScrollValue = 0;
  setScrollCount = 0;
  notValidScroll = {};
  lastWindowHeight = undefined;
  topAdjust = 'start';
  topAnimateAmount = 0;
  topAnimateSpeed = 0;

  if (!isIPhone) {
    return;
  }

  if (currentPosition !== 'top' && currentPosition !== 'bottom') {
    return;
  }

  if (getKeyboardSize() < IPHONE_KEYBOARD_REJECT_OFFSET) {
    setKeyboardSize(0);
  }

  const body = document.body;

  height = body.offsetHeight;
  width = body.offsetWidth;

  // No need to remove scroll listener here because
  // the same function is always being added and that prevents duplicates.
  // If it's going to be changed to a dynamic function, then
  // window.removeEventListener('scroll', onScroll)
  // should be applied here.
  window.addEventListener('scroll', onScroll);

  if (currentPosition !== 'top' || !isLandscapePhone()) {
    setTimer();
    setScroll();
  }
}

export function onClose() {
  if (currentPosition === 'top' || currentPosition === 'bottom') {
    if (removeListenerTimer) {
      clearTimeout(removeListenerTimer);
    }

    window.removeEventListener('scroll', onScroll);
  } else {
    document.body.classList.remove('ScrollViewsDisabled');
  }

  scrollTimerDisabled = false;
  currentPosition = '';
  ignoreScrollEvent = false;
  height = 0;
  width = 0;
}

function onScroll() {
  setTimer();

  // top

  if (currentPosition === 'top') {
    if (isLandscapePhone()) return;

    if (isWKWebView) {
      if (pageYOffset !== 0) {
        setScroll(0);
      }

      return;
    }

    const windowHeight = innerHeight;

    if (topAdjust === 'start') {
      if (windowHeight < height) {
        topAdjust = 'animate';
      } else {
        setScroll(1);
      }
    }

    if (topAdjust === 'animate') {
      topAnimateAmount = height - windowHeight;

      if (!topAnimateSpeed) {
        topAnimateSpeed = Math.max(1, Math.min(4, Math.floor(topAnimateAmount / 10)));
      }

      if (topAnimateAmount <= 0) {
        topAdjust = 'stop';
      } else {
        const magnifier = isIPad ? (iosMajor < 11 ? 3 : 2) : 1;
        const offset = Math.min(topAnimateAmount, topAnimateSpeed) * magnifier;
        setScroll(offset);
      }
    }

    if (topAdjust === 'stop') {
      setScroll(1);
    }

    return;
  }

  if (currentPosition !== 'bottom') {
    return;
  }

  // bottom

  const scrollTop = pageYOffset;
  const keyboardSize = getKeyboardSize();

  if (ignoreScrollEvent) {
    ignoreScrollEvent = false;

    if (scrollTop === setScrollValue) {
      return;
    }
  }

  if (isWKWebView) {
    if (setScrollCount <= 5) {
      setScroll();
    }

    return;
  }

  if (scrollTop > IPHONE_KEYBOARD_REJECT_OFFSET) {
    if (scrollTop > keyboardSize) {
      setKeyboardSize(scrollTop);

      if (!isWKWebView) {
        setScroll();
      }
    } else if (scrollTop < keyboardSize) {
      if (
        notValidScroll[scrollTop] ||
        scrollTop > applySafariKeyboardOffset(keyboardSize)
      ) {
        notValidScroll[scrollTop] = true;
        setScroll(height);
      } else {
        setScroll();
      }
    } else if (scrollTop !== applySafariKeyboardOffset(keyboardSize)) {
      setScroll();
    }
  } else if (!keyboardSize) {
    // For hardware keyboard / emulator keyboard
    if (scrollTop < IOS_NO_KEYBOARD_ALLOWED_OFFSET) {
      if (lastSmallScrollSize === scrollTop) {
        smallKeyboardCount++;
      } else {
        lastSmallScrollSize = scrollTop;
        smallKeyboardCount = 1;
      }

      if (smallKeyboardCount >= 3) {
        window.removeEventListener('scroll', onScroll);
        setKeyboardSize(lastSmallScrollSize);
      }

      setTimeout(() => {
        setScroll();
      }, 300);
    } else {
      setScroll();
    }
  }
}

function setScroll(value) {
  ignoreScrollEvent = true;

  const keyboardSize = getKeyboardSize();
  let scrollTop;

  if (currentPosition === 'bottom') {
    if (value) {
      scrollTop = value;
    } else if (keyboardSize && !isWKWebView && !isIPad) {
      scrollTop = applySafariKeyboardOffset(keyboardSize);
    } else {
      scrollTop = height;
    }
  } else if (currentPosition === 'top') {
    scrollTop = isFinite(value) ? value : 1;
  }

  setScrollCount++;
  setScrollValue = scrollTop;

  window.scrollTo(0, scrollTop);
}

function setTimer() {
  if (removeListenerTimer) {
    clearTimeout(removeListenerTimer);
  }

  if (scrollTimerDisabled) {
    return;
  }

  removeListenerTimer = setTimeout(() => {
    scrollTimerDisabled = true;
    removeListenerTimer = null;

    window.removeEventListener('scroll', onScroll);
  }, 500);
}

function applySafariKeyboardOffset(scrollTop) {
  if (isIPad || isWKWebView) {
    return scrollTop;
  }

  if (Math.abs(window.orientation) === 90 && screen.width >= 375) {
    return scrollTop;
  }

  // is iPhone X
  if (isIPhoneX) {
    scrollTop = scrollTop - IPHONE_X_SAFARI_BOTTOM_BAR;
  } else {
    scrollTop = scrollTop - IPHONE_SAFARI_BOTTOM_BAR;
  }

  return scrollTop;
}

function getKeyboardSize() {
  if (Math.abs(window.orientation) === 90) {
    return keyboardSizeH;
  }

  return keyboardSizeV;
}

function setKeyboardSize(val) {
  if (Math.abs(window.orientation) === 90) {
    keyboardSizeH = val;
  } else {
    keyboardSizeV = val;
  }
}
