import * as DeviceKeyboard from '#mobile/lib/IOSDevice/Keyboard';
import {
  isIPad, isIOS,
  isWKWebView,
  isLandscapePhone,
} from '#mobile/lib/IOSDevice/IOSDetections';

const DEFAULT_LAYOUT_SELECTOR = 'body';

let preventScrollNeeded = true;
let htmlHeight;
let windowHeight;
let isBannerHidden;
let isScrolling = false;
let keyboardState = 'closed';
let scrollTimer;
let animatingBanner;
let ignoreOneResize;
let initialized = false;

let stack = [];
let entry;

export function init(params) {
  if (initialized) {
    cleanDocumentViews();
  }

  preventDocumentScroll(params);
}

// Scrolling is prevented unless some element, e.g. inner scroll view asks not to.
// In this case the scroll view must ensure that scrolling isn't going
// to propagate to <body>.
export function preventDocumentScroll(params = {}) {
  if (!isIOS) return;

  // params.topBanner can be changed in the same entry, e.g. on different pages
  // changing params.layoutElement requires new entry (adding stack or removing and re-adding)

  if (params.stack === true || !initialized) {
    stackPush();

    if (params.layoutElement && params.layoutElement.nodeType) {
      entry.layoutElement = params.layoutElement;
    } else {
      entry.layoutElement = document.querySelector(params.layoutElement || DEFAULT_LAYOUT_SELECTOR);
    }
  }

  if (params.topBanner === false) {
    entry.topBanner = false;
  } else {
    entry.topBanner = true;
  }

  if (initialized) return;
  initialized = true;

  window.addEventListener('focusin', onFocusIn);
  window.addEventListener('focusout', onFocusOut);

  document.addEventListener('touchmove', onMoveCapture, true);
  document.addEventListener('touchmove', onMoveBubble, false);

  window.addEventListener('resize', onResize);
  DeviceKeyboard.onCloseCallback(onKeyboardClose);

  if (isWKWebView) {
    return;
  }

  window.addEventListener('orientationchange', onOrientationChange);

  requestAnimationFrame(() => {
    if (isLandscapePhone()) {
      onOrientationChange(null, true);
    } else {
      onResize();

      if (entry && !entry.topBanner) {
        requestAnimationFrame(hideTopBanner);
      } else if (!isBannerHidden) {
        requestAnimationFrame(showTopBanner);
      }
    }
  });
}

export function restoreDocumentScroll() {
  if (!initialized) return;
  initialized = false;

  cleanDocumentViews();

  // Restore offset if last entry
  if (stack.length === 1) {
    entry.layoutOffset = null;
    setLayoutOffset();
    document.body.style.height = '';
  }

  entry.layoutElement = null;
  stackPop();

  // Set new offset if there are other entries in the stack
  if (entry) {
    setLayoutOffset();
  }

  window.removeEventListener('focusin', onFocusIn);
  window.removeEventListener('focusout', onFocusOut);

  document.removeEventListener('touchmove', onMoveCapture, true);
  document.removeEventListener('touchmove', onMoveBubble, false);

  window.removeEventListener('resize', onResize);
  window.removeEventListener('orientationchange', onOrientationChange);

  window.removeEventListener('resize', onLandscapeResize);
  window.removeEventListener('scroll', onWindowScroll);

  DeviceKeyboard.offCloseCallback(onKeyboardClose);
}

export function cleanDocumentViews() {
  entry.scrollViews.forEach(view => cleanScrollView(view));
  entry.scrollViews = [];
}

export function allowScrolling(e) {
  const params = e.currentTarget.__ScrollView;

  if (params.state === 'prevented') return;

  if (params.state === 'start' && (!params.allowX || !params.allowY)) {
    const offsetX = Math.abs(params.startX - e.changedTouches[0].clientX);
    const offsetY = Math.abs(params.startY - e.changedTouches[0].clientY);

    if (!params.allowX && offsetX > offsetY) {
      params.state = 'prevented';
      return;
    }

    if (!params.allowY && offsetY > offsetX) {
      params.state = 'prevented';
      return;
    }
  }

  if (params.state !== 'allowed') {
    params.state = 'allowed';
  }

  preventScrollNeeded = false;

  if (!params.overscrollX) {
    const scrollLeft = e.currentTarget.scrollLeft;
    const offsetX = params.startX - e.changedTouches[0].clientX;

    if ((scrollLeft <= 0 && offsetX <= 0) || (scrollLeft >= params.maxX && offsetX >= 0)) {
      preventScrollNeeded = true;

      if (params.standalone) {
        e.preventDefault();
      }
    }
  }

  if (!params.overscrollY) {
    const scrollTop = e.currentTarget.scrollTop;
    const offsetY = params.startY - e.changedTouches[0].clientY;

    if ((scrollTop <= 0 && offsetY <= 0) || (scrollTop >= params.maxY && offsetY >= 0)) {
      preventScrollNeeded = true;

      if (params.standalone) {
        e.preventDefault();
      }
    }
  }
}

function scrollingStart(e) {
  const target = e.currentTarget;
  const params = target.__ScrollView;

  params.state = 'start';
  params.startX = e.changedTouches[0].clientX;
  params.startY = e.changedTouches[0].clientY;

  params.maxX = params.overscrollX ? null : target.scrollWidth - target.clientWidth;
  params.maxY = params.overscrollY ? null : target.scrollHeight - target.clientHeight;
}

function scrollingEnd(e) {
  const params = e.currentTarget.__ScrollView;
  params.state = '';
}

export function setScrollView(view, params = {}) {
  if (!isIOS) return;

  if (params.override === false && view.__ScrollView) {
    return;
  }

  if (params.standalone !== true) {
    if (!initialized) return;

    if (!view.__ScrollView) {
      entry.scrollViews.push(view);
    }
  }

  view.__ScrollView = {
    allowX: params.allowX !== false,
    allowY: params.allowY !== false,
    overscrollX: params.overscrollX !== false,
    overscrollY: params.overscrollY !== false,
    standalone: params.standalone === true
  };

  if (entry) {
    if (!isWKWebView) {
      if (params.topBanner !== false) {
        view.__ScrollView.topBanner = params.topBanner || { hide: 30, show: 60 };
      }

      view.addEventListener('scroll', onViewScroll);
    }
  }

  view.addEventListener('touchstart', scrollingStart)
  view.addEventListener('touchmove', allowScrolling);
  view.addEventListener('touchend', scrollingEnd);
}

export function cleanScrollView(view) {
  view.__ScrollView = null;

  view.removeEventListener('touchstart', scrollingStart)
  view.removeEventListener('touchmove', allowScrolling);
  view.removeEventListener('touchend', scrollingEnd);
  view.removeEventListener('scroll', onViewScroll);
}

function onViewScroll(e) {
  if (keyboardState !== 'closed' || isLandscapePhone()) {
    isScrolling = false;
    scrollTimer && clearTimeout(scrollTimer);
    return;
  }

  isScrolling = true;

  const topBanner = e.target.__ScrollView.topBanner;

  if (entry && entry.topBanner && topBanner) {
    onBannerFix(e.target, topBanner.show, topBanner.hide);
  } else {
    onBannerFix(e.target, Infinity, 0);
  }

  scrollTimer && clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    isScrolling = false;
    onResize();
  }, 100);
}

function onResize() {
  if (isScrolling) return;
  if (ignoreOneResize) {
    ignoreOneResize = false;
    return;
  }

  if (isLandscapePhone()) {
    return;
  }

  let scrollTop = window.pageYOffset;

  if (scrollTop && keyboardState !== 'opened') {
    keyboardState === 'opened';
  }

  if (keyboardState !== 'closed') {
    return;
  }

  if (isWKWebView) {
    return;
  }

  htmlHeight = document.documentElement.offsetHeight;
  windowHeight = innerHeight;

  isBannerHidden = htmlHeight === windowHeight;

  if (animatingBanner === 'show') {
    animatingBanner = null;
    requestAnimationFrame(showTopBanner);
  } else if (animatingBanner === 'hide') {
    animatingBanner = null;
    requestAnimationFrame(hideTopBanner);
  }
}

function onOrientationChange(e, fast) {
  if (!isIPad) {
    if (Math.abs(window.orientation) === 90) {
      window.addEventListener('resize', onLandscapeResize);

      document.body.style.height = '';
      entry.layoutHeight = null;

      if (fast) {
        setTimeout(() => {
          window.scrollTo(0, -300);
          onLandscapeResize();
        });
      } else {
        setTimeout(() => {
          window.scrollTo(0, -300);
          // Calling resize here will prevent iOS 11+ top and bottom
          // bars from showing on orientation change. We want it to show
          // onLandscapeResize();
        }, 400);
      }
    } else {
      window.removeEventListener('resize', onLandscapeResize);

      entry.layoutOffset = null;
      setLayoutOffset();

      if (!entry.topBanner) {
        setTimeout(() => {
          hideTopBanner();
        }, 400);
      }
    }
  } else {
    if (!entry.topBanner) {
      setTimeout(() => {
        hideTopBanner();
      }, 400);
    }
  }
}

function onLandscapeResize() {
  if (keyboardState !== 'closed') {
    return;
  }

  const bodyHeight = document.body.offsetHeight;
  const offset = bodyHeight - innerHeight;

  entry.layoutOffset = offset;
  setLayoutOffset();

  window.scrollTo(0, bodyHeight);
}

function onWindowScroll() {
  if (pageYOffset) {
    keyboardState = 'opened';
    window.removeEventListener('scroll', onWindowScroll);
  }
}

function onMoveCapture(e) {
  preventScrollNeeded = true;
}

function onMoveBubble(e) {
  if (preventScrollNeeded) {
    e.preventDefault();
  }
}

function isInput(e) {
  const target = e && e.target;
  const isAutoFocus = (e.eventPhase === 0 && target.getAttribute('autofocus'));

  let isInput = false;

  if (target.tagName.toLowerCase() === 'textarea' && !isAutoFocus) {
    isInput = true;
  }
  if (target.tagName.toLowerCase() === 'input' && !['checkbox', 'radio', 'image', 'submit'].includes(target.type) && !isAutoFocus) {
    isInput = true;
  }
  if (target.tagName.toLowerCase() === 'select') {
    isInput = true;
  }

  return isInput;
}

function onFocusIn(e) {
  if (isInput(e)) {
    const input = e && e.target;
    let position;

    keyboardState = 'opening';
    window.addEventListener('scroll', onWindowScroll);

    DeviceKeyboard.onOpen(position, {
      exitIfStarted: true
    });
  }
}

function onFocusOut(e) {
  if (isInput(e)) {
    DeviceKeyboard.onClose({ exitIfStarted: true });
  }
}

function onKeyboardClose() {
  window.removeEventListener('scroll', onWindowScroll);
  keyboardState = 'closed';

  setTimeout(() => {
    if (isLandscapePhone()) {
      onLandscapeResize();
    } else {
      onResize();
    }
  }, 100);
}

function onBannerFix(elem, showThreshold, hideThreshold) {
  let scrollTop = elem.scrollTop;

  // Improve with better animation on touchmove
  if (scrollTop <= -showThreshold && (isBannerHidden || animatingBanner)) {
    animatingBanner = 'show';

    window.scrollTo(0, -10);
  } else if (scrollTop >= hideThreshold && (!isBannerHidden || animatingBanner)) {
    animatingBanner = 'hide';

    window.scrollTo(0, 10);
  }
}

export function hideTopBanner() {
  window.scrollTo(0, 300);
}

export function showTopBanner() {
  window.scrollTo(0, -300);
}

function stackPush() {
  entry = getDefaultStackEntry();
  stack.push(entry);
}

function stackPop() {
  stack.pop();
  entry = stack.length ? stack[stack.length - 1] : null;
}

function getDefaultStackEntry() {
  return { initialized: false, scrollViews: [] };
}

function setLayoutOffset() {
  const offset = entry.layoutOffset;

  entry.layoutElement.style.top = offset ? offset + 'px' : '';
}
