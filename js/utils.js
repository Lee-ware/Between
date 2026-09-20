// ===================== UTILITIES =====================

const Utils = (() => {

  // ---- Seeded PRNG (mulberry32) ----
  function seededRandom(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function pick(arr, rnd) {
    return arr[Math.floor((rnd ? rnd() : Math.random()) * arr.length)];
  }

  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor((rnd ? rnd() : Math.random()) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function cap(s) {
    if (!s) return s;
    const t = s.trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function stripTrailingPunct(s) {
    return s.replace(/[?.!]+\s*$/, '').trim();
  }

  // Strip common leading framing phrases used in majority/prediction prompts
  const PREFIX_PATTERNS = [
    /^which would (most|more) people (choose|rather choose)?:?\s*/i,
    /^which would (more|most) people rather (lose|choose)( for a month)?:?\s*/i,
    /^which sounds better to most people:?\s*/i,
    /^which would students more likely choose:?\s*/i,
    /^which will (the crowd|more people) choose( more often)?:?\s*/i,
    /^which will change everyday life more over the next decade:?\s*/i,
    /^which will become more common first:?\s*/i,
    /^would more people choose to\s*/i,
    /^predict which answer will be more popular:?\s*/i,
    /^predict what your closest friend would choose:?\s*/i,
  ];

  function stripFramingPrefix(text) {
    let t = text;
    for (const re of PREFIX_PATTERNS) {
      if (re.test(t)) { t = t.replace(re, ''); break; }
    }
    // generic ":" split fallback
    if (t === text && t.includes(':')) {
      const idx = t.indexOf(':');
      const after = t.slice(idx + 1).trim();
      if (after.length > 4) t = after;
    }
    return t;
  }

  // Try to split a prompt into two binary options. Returns null if not binary-shaped.
  function parseBinary(rawPrompt) {
    let text = stripFramingPrefix(rawPrompt);
    text = text.trim();
    // remove trailing ?
    let core = stripTrailingPunct(text);

    // Try ", or " first (keeps clause boundaries cleaner)
    let parts = null;
    if (/,\s*or\s+/i.test(core)) {
      parts = core.split(/,\s*or\s+/i);
    } else if (/\bor\b/i.test(core)) {
      // split on the LAST " or " occurrence to avoid breaking phrases with earlier 'or'
      const idx = core.toLowerCase().lastIndexOf(' or ');
      if (idx > -1) {
        parts = [core.slice(0, idx), core.slice(idx + 4)];
      }
    }
    if (!parts || parts.length !== 2) return null;
    let [a, b] = parts.map(s => s.trim());
    if (!a || !b || a.length > 90 || b.length > 90) return null;
    return { a: cap(a), b: cap(b) };
  }

  // Detect "Will ..." yes/no shaped prediction/random prompts with no explicit binary
  function isYesNoShaped(rawPrompt) {
    return /^will\s/i.test(rawPrompt.trim()) && !parseBinary(rawPrompt);
  }

  // Detect list-style prompts like "Pick one: comfort, adventure, status, freedom."
  function parseList(rawPrompt) {
    const m = rawPrompt.match(/:\s*([^.]+)\.?$/);
    if (!m) return null;
    const chunk = m[1];
    if (!/,/.test(chunk)) return null;
    const items = chunk.split(/,|\band\b/i).map(s => s.trim()).filter(Boolean);
    if (items.length < 3) return null;
    return items.map(cap);
  }

  function fmtNum(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString();
  }

  function fmtPct(n) {
    return `${Math.round(n)}%`;
  }

  // ---- Icons (feather-style inline SVG strings) ----
  const ICONS = {
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`,
    grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`,
    person: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`,
    back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`,
    next: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 01-4 0v-.09A1.7 1.7 0 009 19.4a1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.55-1H3a2 2 0 010-4h.09A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-1.55V3a2 2 0 014 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9a1.7 1.7 0 001.55 1H21a2 2 0 010 4h-.09a1.7 1.7 0 00-1.51 1z"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M7 20V10M12 20V4M17 20v-7"/></svg>`,
    flame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 17a2.5 2.5 0 002.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7.5 7.5 0 11-15 0c0-1.153.433-2.294 1-3 1.789 2.394 3.5 1 4-1.5z"/></svg>`,
    brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4a3 3 0 00-3 3 3 3 0 00-1 5.83A3.5 3.5 0 007.5 19 3 3 0 0010.5 21H12M15 4a3 3 0 013 3 3 3 0 011 5.83A3.5 3.5 0 0116.5 19 3 3 0 0113.5 21H12M12 4v17"/></svg>`,
    split: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h4l6 12h4M3 18h4l3-6M17 6h4M17 18h4"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
    ruler: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l14-14 4 4L7 21l-4-4z"/><path d="M13 6l2 2M9 10l2 2M5 14l2 2"/></svg>`,
    layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/></svg>`,
    shuffle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4L12 2z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>`,
    bookmarkFilled: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-5M12 8h.01"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>`,
  };

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function brandMark(className = '') {
    const cls = className ? `between-brand-mark ${className}` : 'between-brand-mark';
    return `<svg class="${cls}" viewBox="0 0 128 128" aria-hidden="true">
      <defs>
        <linearGradient id="between-g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38d3ff"/><stop offset=".48" stop-color="#7c5cff"/><stop offset="1" stop-color="#ff5cf0"/></linearGradient>
        <linearGradient id="between-g2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9d42"/><stop offset=".45" stop-color="#ff5cf0"/><stop offset="1" stop-color="#38d3ff"/></linearGradient>
        <linearGradient id="between-g3" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#7c5cff"/><stop offset=".5" stop-color="#38d3ff"/><stop offset="1" stop-color="#ff9d42"/></linearGradient>
      </defs>
      <g class="brand-rings" fill="none" stroke-linecap="round">
        <ellipse cx="64" cy="64" rx="42" ry="23" transform="rotate(-27 64 64)" stroke="url(#between-g1)" stroke-width="6"/>
        <ellipse cx="64" cy="64" rx="42" ry="23" transform="rotate(27 64 64)" stroke="url(#between-g2)" stroke-width="6"/>
        <ellipse cx="64" cy="64" rx="30" ry="39" stroke="url(#between-g3)" stroke-width="5" opacity=".9"/>
      </g>
      <g class="brand-core"><circle cx="64" cy="64" r="13" fill="#0b0b0d" stroke="currentColor" stroke-width="2.5"/><circle cx="59.8" cy="62" r="1.7" fill="#38d3ff"/><circle cx="68.2" cy="62" r="1.7" fill="#ff5cf0"/><path d="M60 68 Q64 71 68 68" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></g>
    </svg>`;
  }

  function icon(name) {
    const raw = ICONS[name] || '';
    // Icons ship without width/height (only a viewBox), which lets some browsers
    // fall back to an oversized default replaced-element size in flex contexts.
    // Forcing 1em/1em makes every icon scale predictably with its container's
    // font-size instead of ballooning unexpectedly.
    return raw.replace('<svg ', '<svg width="1em" height="1em" style="display:block" ');
  }

  return {
    seededRandom, hashString, todayKey, pick, shuffle, clamp, cap,
    stripTrailingPunct, stripFramingPrefix, parseBinary, isYesNoShaped, parseList,
    fmtNum, fmtPct, icon, brandMark, escapeHtml
  };
})();
