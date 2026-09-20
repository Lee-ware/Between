// ===================== STORAGE (local-first, versioned) =====================

const Storage = (() => {
  const VERSION = 'v1';
  const NS = `between:${VERSION}`;

  const KEYS = {
    history: `${NS}:history`,      // array of {id, mode, ts, result}
    stats: `${NS}:stats`,          // aggregated stats object
    settings: `${NS}:settings`,    // user preferences
    progress: `${NS}:progress`,    // seen ids, recent ids, cooldowns
    session: `${NS}:session`,      // in-progress session state
    tendency: `${NS}:tendency`,    // lightweight local choice-pattern tracking
    moments: `${NS}:moments`,      // personal saved-experience archive
    timeCapsules: `${NS}:capsules`, // answers saved to revisit later
    crowdVoted: `${NS}:crowdvoted`, // which Majority items this device already voted on
  };

  // ---- Storage schema versioning & migrations ----
  // This is a foundation, not a full migration system: today's data shape IS
  // schema version 1, so a fresh or existing V2 install has nothing to migrate.
  // When a future version changes what's stored (e.g. adding Moments or Time
  // Capsule data), bump SCHEMA_VERSION and add a numbered function to
  // MIGRATIONS below — runMigrations() will call every step between the
  // person's stored version and the current one, in order, once at boot.
  const SCHEMA_VERSION = 1;
  const SCHEMA_KEY = 'between:schema_version';
  const MIGRATIONS = {
    // 2: () => { /* example: move `history` into IndexedDB, transform shape, etc. */ },
  };

  function runMigrations() {
    let from;
    try {
      const raw = localStorage.getItem(SCHEMA_KEY);
      from = raw === null ? SCHEMA_VERSION : JSON.parse(raw); // no stamp yet = nothing to migrate from
    } catch (e) {
      from = SCHEMA_VERSION;
    }
    for (let v = from + 1; v <= SCHEMA_VERSION; v++) {
      if (typeof MIGRATIONS[v] === 'function') {
        try { MIGRATIONS[v](); console.info(`[BETWEEN] storage migrated to schema v${v}`); }
        catch (e) { console.warn(`[BETWEEN] storage migration to v${v} failed`, e); }
      }
    }
    try { localStorage.setItem(SCHEMA_KEY, JSON.stringify(SCHEMA_VERSION)); } catch (e) { /* ignore */ }
  }
  runMigrations();

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Storage read failed', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage write failed', key, e);
      return false;
    }
  }

  function defaultStats() {
    return {
      answered: 0,
      correctKnowledge: 0,
      totalKnowledge: 0,
      pickOneCount: 0,
      scenarioCount: 0,
      majorityCorrect: 0,
      majorityTotal: 0,
      estimationTotal: 0,
      estimationAccuracySum: 0,
      predictionCount: 0,
      randomCount: 0,
      brainBestScore: 0,
      brainCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      byMode: {},       // mode -> count
      byCategory: {},   // category -> {count}
      closestEstimatePct: null,
      lastActiveDate: null,
      daysActive: [],   // array of date strings
      firstSessionComplete: false,
      totalSessions: 0,
    };
  }

  function defaultProgress() {
    return {
      seenIds: [],          // all-time answered ids
      recentIds: [],         // last ~15 ids for cooldown
      recentSimilarity: [],  // last ~6 similarity groups
      recentModes: [],       // last ~4 modes
      recentCategories: [],  // last ~5 categories
      recentMoods: [],       // last ~4 moods (serious/chaotic/playful/...)
      dailyDoneDates: {},    // dateKey -> {pick:true, knowledge:true, ...}
      onboardingIndex: 0,    // how far into curated first-session sequence
      onboardingDone: false,
    };
  }

  function defaultSettings() {
    return {
      sound: false,
      reducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      theme: 'dark',
      personalization: true,
    };
  }

  function defaultTendency() {
    return {}; // axis name -> { poleName: count, ... }
  }

  const api = {
    KEYS,
    getHistory: () => read(KEYS.history, []),
    setHistory: (h) => write(KEYS.history, h),
    addHistory: (entry) => {
      const h = api.getHistory();
      h.push(entry);
      if (h.length > 500) h.shift();
      write(KEYS.history, h);
    },
    getStats: () => read(KEYS.stats, defaultStats()),
    setStats: (s) => write(KEYS.stats, s),
    updateStats: (mutator) => {
      const s = api.getStats();
      mutator(s);
      write(KEYS.stats, s);
      return s;
    },
    getSettings: () => read(KEYS.settings, defaultSettings()),
    setSettings: (s) => write(KEYS.settings, s),
    updateSettings: (mutator) => {
      const s = api.getSettings();
      mutator(s);
      write(KEYS.settings, s);
      return s;
    },
    getProgress: () => read(KEYS.progress, defaultProgress()),
    setProgress: (p) => write(KEYS.progress, p),
    updateProgress: (mutator) => {
      const p = api.getProgress();
      mutator(p);
      write(KEYS.progress, p);
      return p;
    },
    getSession: () => read(KEYS.session, null),
    setSession: (s) => write(KEYS.session, s),
    clearSession: () => localStorage.removeItem(KEYS.session),

    getTendency: () => read(KEYS.tendency, defaultTendency()),
    setTendency: (t) => write(KEYS.tendency, t),
    updateTendency: (mutator) => {
      const t = api.getTendency();
      mutator(t);
      write(KEYS.tendency, t);
      return t;
    },

    getMoments: () => read(KEYS.moments, []),
    setMoments: (m) => write(KEYS.moments, m),
    updateMoments: (mutator) => {
      const m = api.getMoments();
      mutator(m);
      // Bound growth — a personal archive, not an infinite log.
      const capped = m.length > 300 ? m.slice(m.length - 300) : m;
      write(KEYS.moments, capped);
      return capped;
    },

    getTimeCapsules: () => read(KEYS.timeCapsules, []),
    setTimeCapsules: (c) => write(KEYS.timeCapsules, c),
    updateTimeCapsules: (mutator) => {
      const c = api.getTimeCapsules();
      mutator(c);
      const capped = c.length > 200 ? c.slice(c.length - 200) : c;
      write(KEYS.timeCapsules, capped);
      return capped;
    },

    getCrowdVoted: () => read(KEYS.crowdVoted, []),
    addCrowdVoted: (itemId) => {
      const arr = api.getCrowdVoted();
      if (!arr.includes(itemId)) arr.push(itemId);
      const capped = arr.length > 200 ? arr.slice(arr.length - 200) : arr;
      write(KEYS.crowdVoted, capped);
    },

    resetAll: () => {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    },

    SCHEMA_VERSION,
    defaultStats, defaultProgress, defaultSettings, defaultTendency,
  };

  return api;
})();
