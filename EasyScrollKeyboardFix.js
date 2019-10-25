const FORCE_SCROLL_VALUE = 999999;

let scrollEventCount = 0;
let lastScrollTop = 0;
let sameScrollTopCount = 0;
let lastMaxScrollTop = 0;
let scrollRepeatTimer = null;
let maxScrollFixTimer = null;

export function onOpen(position = 'default') {
  if (scrollRepeatTimer) {
    clearTimeout(scrollRepeatTimer);
    scrollRepeatTimer = null;
  }

  if (maxScrollFixTimer) {
    clearTimeout(maxScrollFixTimer);
    maxScrollFixTimer = null;
  }

  lastScrollTop = 0;
  sameScrollTopCount = 0;
  scrollEventCount = 0;
  lastMaxScrollTop = 0;

  window.addEventListener('scroll', easyOnScroll);

  setTimeout(() => {
    scrollTo(0, FORCE_SCROLL_VALUE);
  }, 10);
  setTimeout(() => {
    scrollTo(0, FORCE_SCROLL_VALUE);
  }, 100);
  setTimeout(() => {
    scrollTo(0, FORCE_SCROLL_VALUE);
  }, 200);
  setTimeout(() => {
    scrollTo(0, FORCE_SCROLL_VALUE);
  }, 300);
  setTimeout(() => {
    scrollTo(0, FORCE_SCROLL_VALUE);
  }, 400);
  setTimeout(() => {
    scrollTo(0, FORCE_SCROLL_VALUE);
  }, 500);
}

export function onClose() {
  clearTimeout(scrollRepeatTimer);
  clearTimeout(maxScrollFixTimer);

  lastScrollTop = 0;
  sameScrollTopCount = 0;
  scrollEventCount = 0;
  scrollRepeatTimer = null;
  maxScrollFixTimer = null;

  window.removeEventListener('scroll', easyOnScroll);
}

function easyOnScroll() {
  const scrollTop = pageYOffset;

  scrollEventCount++;

  if (scrollTop !== lastScrollTop && scrollTop !== FORCE_SCROLL_VALUE) {
    lastScrollTop = scrollTop;
    lastMaxScrollTop = Math.max(lastMaxScrollTop, scrollTop);
    scrollTo(0, FORCE_SCROLL_VALUE);
  }

  clearTimeout(maxScrollFixTimer);
  maxScrollFixTimer = setTimeout(() => {
    maxScrollFixTimer = null;
    window.removeEventListener('scroll', easyOnScroll);
    scrollTo(0, FORCE_SCROLL_VALUE);

    setTimeout(() => scrollTo(0, FORCE_SCROLL_VALUE), 1000);
  }, 150);
}