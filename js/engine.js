// ===================== CONTENT ENGINE =====================
// Selection, anti-repeat, sequencing, daily determinism, difficulty adaptation.

const Engine = (() => {

  const DATA = window.BETWEEN_DATA;
  const RAW_ITEMS = (DATA && DATA.items) || [];
  const REQUIRED_FIELDS = ['id', 'mode', 'category', 'prompt'];
  const ITEMS = RAW_ITEMS.filter(i => {
    const ok = i && REQUIRED_FIELDS.every(f => i[f] !== undefined && i[f] !== null && i[f] !== '');
    if (!ok) console.warn('[BETWEEN] dropped malformed content item', i && i.id, i);
    return ok;
  });
  const BY_ID = new Map(ITEMS.map(i => [i.id, i]));
  const BY_MODE = {};
  ITEMS.forEach(i => {
    (BY_MODE[i.mode] = BY_MODE[i.mode] || []).push(i);
  });

  const MODE_META = {
    pick_one:   { label: 'Pick One',   short: 'PICK ONE',   icon: 'split',    color: 'pick_one',   tagline: 'What would you choose?' },
    knowledge:  { label: 'Knowledge',  short: 'KNOWLEDGE',  icon: 'brain',    color: 'knowledge',  tagline: 'What do you actually know?' },
    scenario:   { label: 'Scenario',   short: 'SCENARIO',   icon: 'layers',   color: 'scenario',   tagline: 'What would you do?' },
    majority:   { label: 'Majority',   short: 'MAJORITY',   icon: 'eye',      color: 'majority',   tagline: 'What do you think everyone else chose?' },
    estimation: { label: 'Estimation', short: 'ESTIMATION', icon: 'ruler',    color: 'estimation', tagline: 'How close can you get?' },
    prediction: { label: 'Prediction', short: 'PREDICTION', icon: 'eye',      color: 'prediction', tagline: 'Can you predict it?' },
    random:     { label: 'Random',     short: 'RANDOM',     icon: 'shuffle',  color: 'random',     tagline: "You don't know what's next." },
    brain:      { label: 'Brain',      short: 'BRAIN',      icon: 'brain',    color: 'brain',      tagline: 'Can you keep up?' },
    mystery:    { label: 'Mystery',    short: 'MYSTERY',    icon: 'sparkle',  color: 'mystery',    tagline: "You don't know what's coming." },
    daily:      { label: 'Daily',      short: 'DAILY',      icon: 'calendar', color: 'daily',      tagline: 'One set, once a day.' },
  };

  const REAL_MODES = ['pick_one', 'knowledge', 'scenario', 'majority', 'estimation', 'prediction', 'random', 'brain'];

  // ---- Curated onboarding order (first ~15%) ----
  // Chosen for maximum variety + hook score, per section 10.
  const ONBOARDING_MODE_SEQUENCE = [
    'pick_one', 'knowledge', 'pick_one', 'majority', 'scenario',
    'prediction', 'pick_one', 'estimation', 'random', 'knowledge',
    'brain', 'pick_one', 'scenario', 'knowledge', 'pick_one'
  ];

  function getItem(id) { return BY_ID.get(id); }

  function itemsForMode(mode) { return BY_MODE[mode] || []; }

  // ---------------- Anti-repeat + scoring-based selection ----------------

  function scoreCandidate(item, progress, opts) {
    const { avoidModes = [], avoidCategories = [], avoidSimilarity = [], avoidMoods = [], preferMode = null } = opts || {};
    let score = (item.hook_score || 50);

    // Freshness: never-seen items get a boost
    if (!progress.seenIds.includes(item.id)) score += 25;

    // Recency penalty (recently answered = heavily penalized, near-exclusion)
    const recentIdx = progress.recentIds.indexOf(item.id);
    if (recentIdx > -1) score -= (200 - recentIdx * 5);

    // Similarity group cooldown
    if (avoidSimilarity.includes(item.similarity_group)) score -= 60;

    // Category cooldown
    if (avoidCategories.includes(item.category)) score -= 30;

    // Mode cooldown (soft, unless user explicitly picked this mode)
    if (avoidModes.includes(item.mode) && item.mode !== preferMode) score -= 40;

    // Mood balancing: if the last couple of experiences shared this item's mood
    // (e.g. several "serious" ones in a row), nudge it down so the session keeps
    // alternating emotional register instead of staying flat.
    if (item.mood && avoidMoods.filter(m => m === item.mood).length >= 2) score -= 20;

    // Slight randomness so it never feels like a formula
    score += Math.random() * 18;

    return score;
  }

  // Pick the best next item, optionally constrained to a specific mode.
  function selectNext({ mode = null, excludeIds = [] } = {}) {
    const progress = Storage.getProgress();
    const pool = (mode ? itemsForMode(mode) : ITEMS).filter(i => !excludeIds.includes(i.id));
    if (pool.length === 0) return null;

    const avoidModes = progress.recentModes.slice(-2);
    const avoidCategories = progress.recentCategories.slice(-3);
    const avoidSimilarity = progress.recentSimilarity.slice(-6);
    const avoidMoods = (progress.recentMoods || []).slice(-3);

    let best = null, bestScore = -Infinity;
    for (const item of pool) {
      const s = scoreCandidate(item, progress, {
        avoidModes, avoidCategories, avoidSimilarity, avoidMoods, preferMode: mode
      });
      if (s > bestScore) { bestScore = s; best = item; }
    }
    return best;
  }

  // "Surprise Me" — full mystery selection considering mode diversity.
  function surpriseMe() {
    const progress = Storage.getProgress();

    // First-session curated onboarding
    if (!progress.onboardingDone && progress.onboardingIndex < ONBOARDING_MODE_SEQUENCE.length) {
      const wantMode = ONBOARDING_MODE_SEQUENCE[progress.onboardingIndex];
      const item = selectNext({ mode: wantMode });
      if (item) return item;
    }

    // Weighted random mode pick that avoids the last 1-2 modes played
    const avoidModes = new Set(progress.recentModes.slice(-2));
    let candidateModes = REAL_MODES.filter(m => !avoidModes.has(m));
    if (candidateModes.length === 0) candidateModes = REAL_MODES.slice();

    const chosenMode = Utils.pick(candidateModes);
    return selectNext({ mode: chosenMode });
  }

  function recordShown(item) {
    Storage.updateProgress(p => {
      p.recentIds.push(item.id);
      if (p.recentIds.length > 15) p.recentIds.shift();

      p.recentModes.push(item.mode);
      if (p.recentModes.length > 4) p.recentModes.shift();

      p.recentCategories.push(item.category);
      if (p.recentCategories.length > 5) p.recentCategories.shift();

      if (!p.recentMoods) p.recentMoods = [];
      if (item.mood) {
        p.recentMoods.push(item.mood);
        if (p.recentMoods.length > 4) p.recentMoods.shift();
      }

      if (item.similarity_group) {
        p.recentSimilarity.push(item.similarity_group);
        if (p.recentSimilarity.length > 6) p.recentSimilarity.shift();
      }

      if (!p.seenIds.includes(item.id)) p.seenIds.push(item.id);
      // Bound growth: seenIds can never exceed the dataset size, but guard anyway.
      if (p.seenIds.length > 1000) p.seenIds = p.seenIds.slice(-1000);

      if (!p.onboardingDone) {
        p.onboardingIndex += 1;
        if (p.onboardingIndex >= ONBOARDING_MODE_SEQUENCE.length) p.onboardingDone = true;
      }
    });
  }

  // ---------------- Daily deterministic content ----------------

  function dailySeedFor(subkey) {
    const dateKey = Utils.todayKey();
    return Utils.hashString(`${dateKey}:${subkey}`);
  }

  function dailyPick(subkey, mode) {
    const seed = dailySeedFor(subkey);
    const rnd = Utils.seededRandom(seed);
    const pool = itemsForMode(mode);
    if (!pool.length) return null;
    // deterministic pick weighted toward higher hook_score using seeded shuffle
    const sorted = Utils.shuffle(pool, rnd).sort((a, b) => (b.hook_score || 0) - (a.hook_score || 0));
    const topSlice = sorted.slice(0, Math.max(3, Math.floor(sorted.length * 0.25)));
    return Utils.pick(topSlice, rnd);
  }

  function getDailySet() {
    return {
      dateKey: Utils.todayKey(),
      pick: dailyPick('pick', 'pick_one'),
      knowledge: dailyPick('knowledge', 'knowledge'),
      crowd: dailyPick('crowd', 'majority'),
      chaos: dailyPick('chaos', 'random'),
    };
  }

  function isDailyDone(dateKey, key) {
    const p = Storage.getProgress();
    return !!(p.dailyDoneDates[dateKey] && p.dailyDoneDates[dateKey][key]);
  }

  function markDailyDone(dateKey, key) {
    Storage.updateProgress(p => {
      if (!p.dailyDoneDates[dateKey]) p.dailyDoneDates[dateKey] = {};
      p.dailyDoneDates[dateKey][key] = true;
      // prune old dates (keep last 14)
      const dates = Object.keys(p.dailyDoneDates).sort();
      while (dates.length > 14) {
        delete p.dailyDoneDates[dates.shift()];
      }
    });
  }

  // ---------------- "Today's picks" for Home ----------------

  function todaysPicks(n = 5) {
    const progress = Storage.getProgress();
    const avoidModes = new Set(progress.recentModes.slice(-2));
    const seedRnd = Utils.seededRandom(Utils.hashString(Utils.todayKey() + ':picks'));
    const highHook = ITEMS.filter(i => (i.hook_score || 0) >= 70);
    const shuffled = Utils.shuffle(highHook, seedRnd);

    const picks = [];
    const usedModes = new Set();
    for (const item of shuffled) {
      if (picks.length >= n) break;
      if (usedModes.has(item.mode) && usedModes.size < REAL_MODES.length) continue;
      picks.push(item);
      usedModes.add(item.mode);
    }
    while (picks.length < n && shuffled.length) {
      const extra = shuffled[picks.length % shuffled.length];
      if (!picks.includes(extra)) picks.push(extra);
      else break;
    }
    return picks.slice(0, n);
  }

  return {
    DATA, ITEMS, MODE_META, REAL_MODES,
    getItem, itemsForMode,
    selectNext, surpriseMe, recordShown,
    getDailySet, isDailyDone, markDailyDone,
    todaysPicks,
  };
})();
