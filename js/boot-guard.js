// BETWEEN — independent startup guard.
// This file intentionally has no dependency on the rest of the app. If a later
// script fails before App.init() can finish, the branded boot screen must not
// trap the user indefinitely.
(() => {
  const START_TIMEOUT_MS = 8000;
  const startedAt = Date.now();

  function showStartupRecovery(reason) {
    const boot = document.getElementById('boot-screen');
    const app = document.getElementById('app');
    if (boot) boot.remove();
    if (!app || app.querySelector('[data-startup-recovery]')) return;

    app.innerHTML = `
      <div class="screen">
        <div class="empty-state" data-startup-recovery>
          <div style="font-weight:800;font-size:17px;color:var(--text);margin-bottom:6px;">BETWEEN couldn’t start.</div>
          <div style="margin-bottom:20px;">Your saved progress is still on this device. Try again to restart the app.</div>
          <button class="btn btn-primary" id="btn-startup-retry">Try again</button>
        </div>
      </div>`;

    const retry = app.querySelector('#btn-startup-retry');
    if (retry) retry.onclick = () => location.reload();
    console.warn('[BETWEEN] startup recovery shown:', reason, 'after', Date.now() - startedAt, 'ms');
  }

  window.__BETWEEN_BOOT_GUARD = {
    complete() {
      window.__BETWEEN_BOOT_COMPLETE = true;
      const boot = document.getElementById('boot-screen');
      if (boot && boot.parentNode) {
        boot.style.opacity = '0';
        setTimeout(() => { if (boot && boot.parentNode) boot.remove(); }, 180);
      }
    },
    fail(reason) {
      window.__BETWEEN_BOOT_COMPLETE = true;
      showStartupRecovery(reason || 'startup failure');
    },
  };

  window.addEventListener('error', (event) => {
    if (!window.__BETWEEN_BOOT_COMPLETE && event && event.error) {
      setTimeout(() => {
        if (!window.__BETWEEN_BOOT_COMPLETE) showStartupRecovery('script error');
      }, 0);
    }
  });

  window.addEventListener('unhandledrejection', () => {
    if (!window.__BETWEEN_BOOT_COMPLETE) {
      setTimeout(() => {
        if (!window.__BETWEEN_BOOT_COMPLETE) showStartupRecovery('unhandled startup promise');
      }, 0);
    }
  });

  setTimeout(() => {
    if (!window.__BETWEEN_BOOT_COMPLETE) showStartupRecovery('startup timeout');
  }, START_TIMEOUT_MS);
})();
