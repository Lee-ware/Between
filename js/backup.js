// ===================== BACKUP (export / import) =====================
// Lets a person's history, Moments, and Time Capsules survive a browser
// reset or move to a new device/browser — without ever needing an account
// or a server. The file is just JSON; nothing here is uploaded anywhere.
//
// Because an imported file is, by definition, untrusted input (it could be
// a genuine backup, a backup from a much older version, or a file someone
// hand-edited or sent maliciously), every field is validated by shape before
// being written to storage, and every field that later gets rendered to the
// screen is escaped at render time (see Screens.momentCardHTML etc.) rather
// than trusted just because it came from "your own" backup file.

const Backup = (() => {
  const APP_TAG = 'BETWEEN';
  const EXPORT_VERSION = 1;

  const ARRAY_KEYS = ['history', 'moments', 'timeCapsules'];
  const OBJECT_KEYS = ['stats', 'settings', 'progress', 'tendency'];

  function gather() {
    return {
      history: Storage.getHistory(),
      stats: Storage.getStats(),
      settings: Storage.getSettings(),
      progress: Storage.getProgress(),
      tendency: Storage.getTendency(),
      moments: Storage.getMoments(),
      timeCapsules: Storage.getTimeCapsules(),
    };
  }

  function exportData() {
    const payload = {
      app: APP_TAG,
      exportVersion: EXPORT_VERSION,
      schemaVersion: Storage.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: gather(),
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `between-backup-${Utils.todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return payload;
  }

  // Shape-only validation — deliberately not exhaustive per-field checking
  // (this is a personal backup file, not a public API), but enough to reject
  // garbage or wildly malformed files before anything touches real storage.
  function validate(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return { valid: false, reason: "That file doesn't look like a BETWEEN backup." };
    }
    if (obj.app !== APP_TAG) {
      return { valid: false, reason: "That file doesn't look like a BETWEEN backup." };
    }
    if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) {
      return { valid: false, reason: 'This backup file is missing its data.' };
    }
    for (const k of ARRAY_KEYS) {
      if (obj.data[k] !== undefined && !Array.isArray(obj.data[k])) {
        return { valid: false, reason: `The "${k}" section of this file isn't in the format BETWEEN expects.` };
      }
    }
    for (const k of OBJECT_KEYS) {
      if (obj.data[k] !== undefined && (typeof obj.data[k] !== 'object' || Array.isArray(obj.data[k]) || obj.data[k] === null)) {
        return { valid: false, reason: `The "${k}" section of this file isn't in the format BETWEEN expects.` };
      }
    }
    return { valid: true };
  }

  function importData(obj) {
    const d = obj.data || {};
    if (Array.isArray(d.history)) Storage.setHistory(d.history);
    if (d.stats) Storage.setStats(Object.assign(Storage.defaultStats(), d.stats));
    if (d.settings) Storage.setSettings(Object.assign(Storage.defaultSettings(), d.settings));
    if (d.progress) Storage.setProgress(Object.assign(Storage.defaultProgress(), d.progress));
    if (d.tendency) Storage.setTendency(d.tendency);
    if (Array.isArray(d.moments)) Storage.setMoments(d.moments);
    if (Array.isArray(d.timeCapsules)) Storage.setTimeCapsules(d.timeCapsules);
    Storage.clearSession(); // an in-progress round from the OLD data isn't meaningful after a restore
  }

  // Opens the browser's native file picker, reads + parses + validates the
  // chosen file, and calls back with either {payload} or {error}. Never
  // touches storage itself — the caller decides what to do (e.g. confirm
  // with the person before overwriting anything).
  function promptImportFile(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        let parsed;
        try {
          parsed = JSON.parse(reader.result);
        } catch (e) {
          callback({ error: "That file isn't valid JSON." });
          return;
        }
        const check = validate(parsed);
        if (!check.valid) { callback({ error: check.reason }); return; }
        callback({ payload: parsed });
      };
      reader.onerror = () => callback({ error: 'Could not read that file.' });
      reader.readAsText(file);
    });

    document.body.appendChild(input);
    input.click();
  }

  return { exportData, validate, importData, promptImportFile };
})();
