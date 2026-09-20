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
  const KNOWN_MODES = new Set(['pick_one','knowledge','scenario','majority','estimation','prediction','random','brain']);

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

  const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

  function cleanString(value, max = 500) {
    return typeof value === 'string' ? value.slice(0, max) : null;
  }

  function cleanHistory(arr) {
    return (Array.isArray(arr) ? arr : []).filter(x => x && typeof x === 'object' && typeof x.id === 'string' && typeof x.mode === 'string')
      .slice(-500).map(x => ({
        id: x.id.slice(0, 80), mode: x.mode.slice(0, 40), category: cleanString(x.category, 80),
        ts: Number.isFinite(x.ts) ? x.ts : Date.now(), success: x.success === true ? true : x.success === false ? false : null,
      }));
  }

  function cleanMoments(arr) {
    return (Array.isArray(arr) ? arr : []).filter(x => x && typeof x === 'object')
      .slice(-300).map(x => ({
        id: cleanString(x.id, 100) || ('moment_' + Math.random().toString(36).slice(2)),
        itemId: cleanString(x.itemId, 80), mode: cleanString(x.mode, 40), category: cleanString(x.category, 80),
        prompt: cleanString(x.prompt, 600) || '', chosenText: cleanString(x.chosenText, 400), resultLabel: cleanString(x.resultLabel, 200),
        success: x.success === true ? true : x.success === false ? false : null,
        dateKey: /^\d{4}-\d{2}-\d{2}$/.test(String(x.dateKey || '')) ? x.dateKey : Utils.todayKey(),
        ts: Number.isFinite(x.ts) ? x.ts : Date.now(),
      }));
  }

  function cleanCapsules(arr) {
    return (Array.isArray(arr) ? arr : []).filter(x => x && typeof x === 'object')
      .slice(-200).map(x => ({
        id: cleanString(x.id, 100) || ('capsule_' + Math.random().toString(36).slice(2)),
        itemId: cleanString(x.itemId, 80), mode: cleanString(x.mode, 40), category: cleanString(x.category, 80),
        prompt: cleanString(x.prompt, 600) || '', originalAnswer: cleanString(x.originalAnswer, 400) || '',
        dateKey: /^\d{4}-\d{2}-\d{2}$/.test(String(x.dateKey || '')) ? x.dateKey : Utils.todayKey(),
        ts: Number.isFinite(x.ts) ? x.ts : Date.now(), periodKey: ['30d','1y','whenever'].includes(x.periodKey) ? x.periodKey : 'whenever',
        revisitAt: x.revisitAt === null || Number.isFinite(x.revisitAt) ? x.revisitAt : null,
        opened: x.opened === true, newAnswer: cleanString(x.newAnswer, 400), openedTs: Number.isFinite(x.openedTs) ? x.openedTs : null,
        sameChoice: x.sameChoice === true ? true : x.sameChoice === false ? false : null,
      }));
  }

  function cleanStats(raw) {
    const s = Object.assign(Storage.defaultStats(), raw && typeof raw === 'object' ? raw : {});
    const numeric = ['answered','correctKnowledge','totalKnowledge','pickOneCount','scenarioCount','majorityCorrect','majorityTotal','estimationTotal','estimationAccuracySum','predictionCount','randomCount','brainBestScore','brainCount','currentStreak','longestStreak','totalSessions'];
    numeric.forEach(k => { s[k] = Number.isFinite(Number(s[k])) && Number(s[k]) >= 0 ? Number(s[k]) : 0; });
    s.closestEstimatePct = s.closestEstimatePct === null ? null : (Number.isFinite(Number(s.closestEstimatePct)) ? Number(s.closestEstimatePct) : null);
    s.byMode = s.byMode && typeof s.byMode === 'object' && !Array.isArray(s.byMode) ? Object.fromEntries(Object.entries(s.byMode).filter(([k,v]) => KNOWN_MODES.has(k) && Number.isFinite(Number(v)) && Number(v) >= 0).map(([k,v]) => [k, Number(v)])) : {};
    s.byCategory = s.byCategory && typeof s.byCategory === 'object' && !Array.isArray(s.byCategory) ? Object.fromEntries(Object.entries(s.byCategory).slice(0, 200).map(([k,v]) => [String(k).slice(0,80), { count: Number.isFinite(Number(v && v.count)) && Number(v.count) >= 0 ? Number(v.count) : 0 }])) : {};
    s.daysActive = Array.isArray(s.daysActive) ? s.daysActive.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(String(x))).slice(-365) : [];
    s.lastActiveDate = /^\d{4}-\d{2}-\d{2}$/.test(String(s.lastActiveDate || '')) ? s.lastActiveDate : null;
    s.firstSessionComplete = s.firstSessionComplete === true;
    return s;
  }

  function cleanSettings(raw) {
    const s = Object.assign(Storage.defaultSettings(), raw && typeof raw === 'object' ? raw : {});
    s.sound = s.sound === true; s.reducedMotion = s.reducedMotion === true; s.personalization = s.personalization !== false; s.theme = 'dark';
    return s;
  }

  function cleanProgress(raw) {
    const p = Object.assign(Storage.defaultProgress(), raw && typeof raw === 'object' ? raw : {});
    ['seenIds','recentIds','recentSimilarity','recentModes','recentCategories','recentMoods'].forEach(k => {
      p[k] = Array.isArray(p[k]) ? p[k].filter(x => typeof x === 'string').slice(-1000) : [];
    });
    p.dailyDoneDates = p.dailyDoneDates && typeof p.dailyDoneDates === 'object' && !Array.isArray(p.dailyDoneDates) ? p.dailyDoneDates : {};
    p.onboardingIndex = Number.isFinite(Number(p.onboardingIndex)) ? Math.max(0, Math.min(100, Number(p.onboardingIndex))) : 0;
    p.onboardingDone = p.onboardingDone === true;
    return p;
  }

  function cleanTendency(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return Storage.defaultTendency();
    const out = {};
    Object.entries(raw).slice(0, 50).forEach(([axis, values]) => {
      if (!values || typeof values !== 'object' || Array.isArray(values)) return;
      out[axis.slice(0, 80)] = {};
      Object.entries(values).slice(0, 20).forEach(([pole, count]) => {
        const n = Number(count); if (Number.isFinite(n) && n >= 0) out[axis.slice(0,80)][pole.slice(0,80)] = n;
      });
    });
    return out;
  }

  function validate(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { valid: false, reason: "That file doesn't look like a BETWEEN backup." };
    if (obj.app !== APP_TAG) return { valid: false, reason: "That file doesn't look like a BETWEEN backup." };
    if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return { valid: false, reason: 'This backup file is missing its data.' };
    for (const k of ARRAY_KEYS) if (obj.data[k] !== undefined && !Array.isArray(obj.data[k])) return { valid: false, reason: `The "${k}" section of this file isn't in the format BETWEEN expects.` };
    for (const k of OBJECT_KEYS) if (obj.data[k] !== undefined && (typeof obj.data[k] !== 'object' || Array.isArray(obj.data[k]) || obj.data[k] === null)) return { valid: false, reason: `The "${k}" section of this file isn't in the format BETWEEN expects.` };
    return { valid: true };
  }

  function importData(obj) {
    const d = obj.data || {};
    if (Array.isArray(d.history)) Storage.setHistory(cleanHistory(d.history));
    if (d.stats) Storage.setStats(cleanStats(d.stats));
    if (d.settings) Storage.setSettings(cleanSettings(d.settings));
    if (d.progress) Storage.setProgress(cleanProgress(d.progress));
    if (d.tendency) Storage.setTendency(cleanTendency(d.tendency));
    if (Array.isArray(d.moments)) Storage.setMoments(cleanMoments(d.moments));
    if (Array.isArray(d.timeCapsules)) Storage.setTimeCapsules(cleanCapsules(d.timeCapsules));
    Storage.clearSession();
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
      if (file.size > MAX_IMPORT_BYTES) { callback({ error: 'That backup file is too large.' }); return; }

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
