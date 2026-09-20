// Browser capability layer — feature detection lives here, not scattered through the UI.
const Capabilities = (() => {
  const mediaReduced = () => { try { return !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; } };
  return Object.freeze({
    get canInstall(){ return !!window.BeforeInstallPromptEvent || !!window.__BETWEEN_INSTALL_PROMPT; },
    get canShare(){ return !!navigator.share; },
    get canShareFiles(){ return !!navigator.share && !!navigator.canShare; },
    get canNotify(){ return 'Notification' in window; },
    get canVibrate(){ return typeof navigator.vibrate === 'function'; },
    get canUseIndexedDB(){ return 'indexedDB' in window; },
    get canUseWebAudio(){ return !!(window.AudioContext || window.webkitAudioContext); },
    get canUsePush(){ return 'serviceWorker' in navigator && 'PushManager' in window; },
    get isStandalone(){ return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true; },
    get isOnline(){ return navigator.onLine !== false; },
    get reducedMotion(){ return mediaReduced(); },
  });
})();
