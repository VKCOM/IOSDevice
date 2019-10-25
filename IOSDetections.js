export const IPHONE_SAFARI_BOTTOM_BAR = 45;
export const IPHONE_X_SAFARI_BOTTOM_BAR = 85;

export const IPHONE_KEYBOARD_REJECT_OFFSET = 180;

// 44 iPhone, 55 iPad, iPad Pro 69
export const IOS_NO_KEYBOARD_ALLOWED_OFFSET = 70;

const ua = navigator.userAgent.toLowerCase();
const isIPadOS = checkIPadOS(ua);
const isIPad = isIPadOS || ua.indexOf('ipad') !== -1;
const isIPhone = !isIPad && ua.search(/iphone|ipod/) !== -1;
const isIOS = isIPhone || isIPad;

let iosVersion = isIOS && navigator.userAgent.match(/OS ([\d_]+) like Mac OS X/i);
let iosMajor;
let iosMinor;

if (isIPadOS) {
  iosMajor = 13;
  iosMinor = 0;
} if (iosVersion) {
  iosVersion = iosVersion[1].split('_');
  iosMajor = +iosVersion[0];
  iosMinor = +iosVersion[1];
}

iosVersion = null;

const isScrollBasedViewport = iosMajor < 13 && !(iosMajor === 11 && iosMinor < 3);
const isWKWebView = isIOS && checkWKWebView(ua);

const isIPhoneX = isIOS && screen.width === 375 &&
  screen.height === 812 && window.devicePixelRatio === 3;

const isIOSChrome = ua.search(/crios/i) !== -1;

export {
  isIPad, isIPhone, isIOS, isIPadOS,
  iosMajor, iosMinor,
  isWKWebView, isScrollBasedViewport,
  isIPhoneX,
  isIOSChrome,
};

export function isLandscapePhone() {
  return Math.abs(window.orientation) === 90 && !isIPad;
}

// Reference:
// https://stackoverflow.com/questions/28795476/detect-if-page-is-loaded-inside-wkwebview-in-javascript/30495399#30495399
function checkWKWebView(ua) {
  if (window.webkit && window.webkit.messageHandlers) {
    return true;
  }

  const lte9 = /constructor/i.test(window.HTMLElement);
  const idb = !!window.indexedDB;

  if (
    ua.indexOf('safari') !== -1 &&
    ua.indexOf('version') !== -1 &&
    !navigator.standalone
  ) {
    // Safari (WKWebView/Nitro since 6+)
  } else if ((!idb && lte9) || !(window.statusbar && window.statusbar.visible)) {
    // UIWebView
  } else if (!lte9 || idb) {
    // WKWebView
    return true;
  }

  return false;
}

export function checkIPadOS(ua) {
  const notIOS = !/ipad|iphone|ipod/.test(ua);
  const macOS = /mac os/.test(ua);

  if (macOS && notIOS && typeof navigator.standalone === 'boolean') {
    return true;
  }

  return false;
}
