// ===================== SCREENS =====================

const Screens = (() => {

  const NAV_ITEMS = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'modes', label: 'Modes', icon: 'grid' },
    { key: 'daily', label: 'Daily', icon: 'calendar' },
    { key: 'profile', label: 'Profile', icon: 'person' },
  ];

  function bottomNav(active) {
    return `
      <nav class="bottom-nav" aria-label="Primary">
        ${NAV_ITEMS.map(n => `
          <button class="nav-item ${n.key === active ? 'active' : ''}" data-nav="${n.key}" aria-label="${n.label}">
            ${Utils.icon(n.icon)}
            <span>${n.label}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  function bindNav(root) {
    root.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => App.navigate(btn.dataset.nav));
    });
  }

  // ---------------------------------------------------------------
  // HOME
  // ---------------------------------------------------------------
  function home(root) {
    const stats = Storage.getStats();
    const acc = Scoring.accuracyPct(stats);
    const streak = Scoring.dayStreak(stats);
    const picks = Engine.todaysPicks(5);
    const session = Storage.getSession();

    const insight = homeInsight(stats);

    root.innerHTML = `
      <div class="screen">
        <div class="home-hero">
          <div class="home-wordmark">BETWEEN</div>
          <div class="home-tagline">Test your instincts.</div>
        </div>

        <button class="surprise-card" id="btn-surprise">
          <div class="glow"></div><div class="glow2"></div>
          <div class="surprise-eyebrow">✨ Mystery</div>
          <div class="surprise-title">Surprise me</div>
          <div class="surprise-sub">One tap. Any mode, any mood — you won't know until it's in front of you.</div>
          <div class="surprise-arrow">Jump in →</div>
        </button>

        ${session ? `
          <button class="continue-card" id="btn-continue">
            <div class="continue-left">
              <div class="continue-badge">${Utils.icon('sparkle')}</div>
              <div>
                <div class="continue-title">Continue your round</div>
                <div class="continue-sub">${session.round.count} answered so far</div>
              </div>
            </div>
            ${Utils.icon('next')}
          </button>` : ''}

        <div class="section-head">
          <div class="section-title">Today's picks</div>
        </div>
        <div class="picks-row" id="picks-row">
          ${picks.map(p => pickCardHTML(p)).join('')}
        </div>

        <div class="section-head">
          <div class="section-title">For you</div>
          <div class="section-link" style="pointer-events:none;">Based on what you’ve played lately</div>
        </div>
        <div class="picks-row">${Engine.forYou(3).map(p => pickCardHTML(p)).join('')}</div>

        <div class="section-head">
          <div class="section-title">Explore</div>
          <button class="section-link" data-nav="modes">See all</button>
        </div>
        <div class="explore-grid">
          ${Engine.REAL_MODES.slice(0, 6).map(m => exploreTileHTML(m)).join('')}
        </div>

        <div class="section-head">
          <div class="section-title">Your stats</div>
        </div>
        <div class="stats-strip">
          <div class="stat-box"><div class="stat-num">${stats.answered}</div><div class="stat-label">Answered</div></div>
          <div class="stat-box"><div class="stat-num">${acc === null ? '—' : acc + '%'}</div><div class="stat-label">Accurate</div></div>
          <div class="stat-box"><div class="stat-num">${streak}</div><div class="stat-label">Day streak</div></div>
          <div class="stat-box"><div class="stat-num">${stats.longestStreak}</div><div class="stat-label">Best streak</div></div>
        </div>

        ${insight ? `<div class="insight-banner">${Utils.icon('sparkle')} ${insight}</div>` : ''}
        <div class="creator-credit">BETWEEN · Developed by THEE LPM</div>
      </div>
      ${bottomNav('home')}
    `;

    bindNav(root);
    root.querySelector('#btn-surprise').addEventListener('click', () => App.beginSession({ type: 'mystery' }));
    const cont = root.querySelector('#btn-continue');
    if (cont) cont.addEventListener('click', () => App.resumeSession());

    root.querySelectorAll('[data-pick-id]').forEach(el => {
      el.addEventListener('click', () => {
        const item = Engine.getItem(el.dataset.pickId);
        App.beginSession({ type: 'mystery', firstItem: item, isMysteryFirst: false });
      });
    });
    root.querySelectorAll('[data-explore-mode]').forEach(el => {
      el.addEventListener('click', () => App.beginSession({ type: 'mode', mode: el.dataset.exploreMode }));
    });
  }

  function pickCardHTML(item) {
    const meta = Engine.MODE_META[item.mode];
    return `
      <button class="pick-card" data-pick-id="${item.id}" style="--card-bg: var(--c-${meta.color}-soft)">
        <div class="pick-mode-tag" style="--tag-fg: var(--c-${meta.color})">${meta.short}</div>
        <div class="pick-card-title">${truncate(item.prompt, 70)}</div>
      </button>
    `;
  }

  function exploreTileHTML(mode) {
    const meta = Engine.MODE_META[mode];
    const count = Engine.itemsForMode(mode).length;
    return `
      <button class="explore-tile" data-explore-mode="${mode}" style="--tile-bg: var(--c-${meta.color}-soft)">
        <div class="explore-tile-icon" style="color:var(--c-${meta.color})">${Utils.icon(meta.icon)}</div>
        <div class="explore-tile-title">${meta.label}</div>
        <div class="explore-tile-sub">${count} experiences</div>
      </button>
    `;
  }

  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; }

  function homeInsight(stats) {
    if (typeof Tendency !== 'undefined' && Tendency.isEnabled()) {
      const t = Tendency.topInsightSentence();
      if (t) return t;
    }
    if (stats.answered < 12) return null;
    const modeEntries = Object.entries(stats.byMode || {});
    if (!modeEntries.length) return null;
    modeEntries.sort((a, b) => b[1] - a[1]);
    const [topMode, topCount] = modeEntries[0];
    const meta = Engine.MODE_META[topMode];
    if (topCount >= 6) return `You keep coming back to ${meta.label}. Maybe try something new today.`;
    if (stats.longestStreak >= 5) return `Your longest streak is ${stats.longestStreak}. Can you beat it?`;
    return `You've answered ${stats.answered} so far. Curious where the next one goes?`;
  }

  // ---------------------------------------------------------------
  // MODES LIST
  // ---------------------------------------------------------------
  function modes(root) {
    root.innerHTML = `
      <div class="screen">
        <div class="topbar">
          <div></div>
          <h1 style="font-size:20px;font-weight:900;">Modes</h1>
          <div></div>
        </div>
        ${Engine.REAL_MODES.map(m => modeCardHTML(m)).join('')}

        <div class="section-head"><div class="section-title">Play With Someone</div></div>
        <button class="mode-card" id="btn-pass-phone">
          <div class="mode-card-icon" style="background:var(--c-random-soft); color:var(--c-random);">\u{1F4F1}</div>
          <div><div class="mode-card-title">Pass the Phone</div><div class="mode-card-sub">Same-device, two players, no accounts</div></div>
        </button>

        <div class="section-head"><div class="section-title">Play With Someone</div></div>
        <button class="mode-card" id="btn-duel"><div class="mode-card-icon" style="background:var(--c-prediction-soft);color:var(--c-prediction)">${Utils.icon('layers')}</div><div><div class="mode-card-title">Between Duel</div><div class="mode-card-sub">Answer, share a link, compare without accounts</div></div></button>
        <button class="mode-card" id="btn-packs"><div class="mode-card-icon" style="background:var(--c-random-soft);color:var(--c-random)">${Utils.icon('sparkle')}</div><div><div class="mode-card-title">Question Lab</div><div class="mode-card-sub">Make private packs and share them</div></div></button>
      </div>
      ${bottomNav('modes')}
    `;
    bindNav(root);
    root.querySelectorAll('[data-mode]').forEach(el => {
      el.addEventListener('click', () => App.beginSession({ type: 'mode', mode: el.dataset.mode }));
    });
    root.querySelector('#btn-pass-phone').addEventListener('click', () => App.navigate('ptpsetup'));
    root.querySelector('#btn-duel').addEventListener('click', () => App.navigate('duel'));
    root.querySelector('#btn-packs').addEventListener('click', () => App.navigate('packs'));
  }

  function modeCardHTML(mode) {
    const meta = Engine.MODE_META[mode];
    const count = Engine.itemsForMode(mode).length;
    return `
      <button class="mode-card" data-mode="${mode}">
        <div class="mode-card-icon" style="background:var(--c-${meta.color}-soft); color:var(--c-${meta.color})">${Utils.icon(meta.icon)}</div>
        <div>
          <div class="mode-card-title">${meta.label}</div>
          <div class="mode-card-sub">${meta.tagline}</div>
        </div>
        <div class="mode-card-count">${count}</div>
      </button>
    `;
  }

  function lockedModeCard(title, iconName, sub) {
    return `
      <div class="mode-card" style="opacity:0.5;cursor:default;">
        <div class="mode-card-icon" style="background:var(--surface-3); color:var(--text-mute)">${Utils.icon(iconName)}</div>
        <div>
          <div class="mode-card-title">${title}</div>
          <div class="mode-card-sub">${sub}</div>
        </div>
        <div class="mode-card-count">${Utils.icon('lock')}</div>
      </div>
    `;
  }

  // ---------------------------------------------------------------
  // DAILY
  // ---------------------------------------------------------------
  function daily(root) {
    const set = Engine.getDailySet();
    const rows = [
      { key: 'pick', title: 'Daily Pick', sub: 'Today\u2019s Pick One', item: set.pick, color: 'pick_one', icon: 'split' },
      { key: 'knowledge', title: 'Daily Knowledge', sub: 'One question, everyone\u2019s the same', item: set.knowledge, color: 'knowledge', icon: 'brain' },
      { key: 'crowd', title: 'Daily Crowd Prediction', sub: 'Predict the majority', item: set.crowd, color: 'majority', icon: 'eye' },
      { key: 'chaos', title: 'Daily Chaos', sub: 'Something random', item: set.chaos, color: 'random', icon: 'shuffle' },
    ];

    root.innerHTML = `
      <div class="screen">
        <div class="topbar">
          <div></div>
          <h1 style="font-size:20px;font-weight:900;">Daily</h1>
          <div></div>
        </div>
        <p style="color:var(--text-dim); font-size:13px; margin-bottom:18px;">
          Same set for everyone today \u2014 ${formatDate(set.dateKey)}.
        </p>
        ${rows.map(r => dailyRowHTML(r)).join('')}
      </div>
      ${bottomNav('daily')}
    `;
    bindNav(root);
    root.querySelectorAll('[data-daily-key]').forEach(el => {
      const row = rows.find(r => r.key === el.dataset.dailyKey);
      if (!row.item) return;
      el.addEventListener('click', () => {
        if (Engine.isDailyDone(set.dateKey, row.key)) return;
        App.startSingle(row.item, { returnTo: 'daily', dailyKey: row.key, dailyDateKey: set.dateKey });
      });
    });
  }

  function dailyRowHTML(row) {
    const done = row.item ? Engine.isDailyDone(Engine.getDailySet().dateKey, row.key) : false;
    return `
      <button class="mode-card" data-daily-key="${row.key}" ${done ? 'style="opacity:0.55;"' : ''}>
        <div class="mode-card-icon" style="background:var(--c-${row.color}-soft); color:var(--c-${row.color})">${Utils.icon(row.icon)}</div>
        <div>
          <div class="mode-card-title">${row.title}</div>
          <div class="mode-card-sub">${row.sub}</div>
        </div>
        <div class="mode-card-count">${done ? Utils.icon('check') : Utils.icon('next')}</div>
      </button>
    `;
  }

  function formatDate(dateKey) {
    const d = new Date(dateKey + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // ---------------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------------
  function profile(root) {
    const stats = Storage.getStats();
    const acc = Scoring.accuracyPct(stats);
    const streak = Scoring.dayStreak(stats);

    const modeEntries = Object.entries(stats.byMode || {}).sort((a, b) => b[1] - a[1]);
    const mostPlayedMode = modeEntries.length ? Engine.MODE_META[modeEntries[0][0]].label : '—';

    const catEntries = Object.entries(stats.byCategory || {}).sort((a, b) => b[1].count - a[1].count);
    const topCategory = catEntries.length ? catEntries[0][0] : '—';

    root.innerHTML = `
      <div class="screen">
        <div class="topbar">
          <div></div>
          <h1 style="font-size:20px;font-weight:900;">Profile</h1>
          <button class="icon-btn" data-nav="settings" aria-label="Settings">${Utils.icon('gear')}</button>
        </div>

        <div class="profile-header">
          <div class="profile-avatar">${Utils.brandMark()}</div>
          <div style="font-weight:800; font-size:16px;">Your BETWEEN</div>
          <div style="color:var(--text-mute); font-size:12px; margin-top:2px;">Stored only on this device</div>
        </div>

        <div class="stats-strip" style="margin-top:24px;">
          <div class="stat-box"><div class="stat-num">${stats.answered}</div><div class="stat-label">Answered</div></div>
          <div class="stat-box"><div class="stat-num">${acc === null ? '—' : acc + '%'}</div><div class="stat-label">Knowledge acc.</div></div>
          <div class="stat-box"><div class="stat-num">${streak}</div><div class="stat-label">Day streak</div></div>
          <div class="stat-box"><div class="stat-num">${stats.longestStreak}</div><div class="stat-label">Best streak</div></div>
        </div>

        ${tendencySectionHTML()}

        <div class="section-head"><div class="section-title">Your Moments</div></div>
        <button class="mode-card" id="btn-open-moments">
          <div class="mode-card-icon" style="background:var(--surface-3);">${Utils.icon('bookmark')}</div>
          <div><div class="mode-card-title">${Moments.count()} saved</div><div class="mode-card-sub">A personal archive \u2014 not a feed</div></div>
          <div class="mode-card-count">${Utils.icon('next')}</div>
        </button>

        <div class="section-head"><div class="section-title">Time Capsule</div></div>
        <button class="mode-card" id="btn-open-capsules">
          <div class="mode-card-icon" style="background:var(--surface-3);">\u{1F55B}</div>
          <div><div class="mode-card-title">${timeCapsuleSummaryTitle()}</div><div class="mode-card-sub">See if you'd still choose the same thing</div></div>
          <div class="mode-card-count">${Utils.icon('next')}</div>
        </button>

        <div class="section-head"><div class="section-title">Highlights</div></div>
        <div class="mode-card" style="cursor:default;">
          <div class="mode-card-icon" style="background:var(--surface-3);">${Utils.icon('brain')}</div>
          <div><div class="mode-card-title">Most played mode</div><div class="mode-card-sub">${mostPlayedMode}</div></div>
        </div>
        <div class="mode-card" style="cursor:default;">
          <div class="mode-card-icon" style="background:var(--surface-3);">${Utils.icon('sparkle')}</div>
          <div><div class="mode-card-title">Most played category</div><div class="mode-card-sub">${Utils.escapeHtml(topCategory)}</div></div>
        </div>
        <div class="mode-card" style="cursor:default;">
          <div class="mode-card-icon" style="background:var(--surface-3);">${Utils.icon('ruler')}</div>
          <div><div class="mode-card-title">Closest estimate</div><div class="mode-card-sub">${stats.closestEstimatePct === null ? 'Play Estimation to find out' : stats.closestEstimatePct.toFixed(1) + '% off'}</div></div>
        </div>
        <div class="mode-card" style="cursor:default;">
          <div class="mode-card-icon" style="background:var(--surface-3);">${Utils.icon('flame')}</div>
          <div><div class="mode-card-title">Longest streak</div><div class="mode-card-sub">${stats.longestStreak} in a row</div></div>
        </div>
      </div>
      ${bottomNav('profile')}
    `;
    bindNav(root);
    root.querySelector('[data-nav="settings"]').addEventListener('click', () => App.navigate('settings'));
    root.querySelector('#btn-open-moments').addEventListener('click', () => App.navigate('moments'));
    root.querySelector('#btn-open-capsules').addEventListener('click', () => App.navigate('timecapsules'));
  }

  function tendencySectionHTML() {
    if (typeof Tendency === 'undefined' || !Tendency.isEnabled()) return '';
    const insights = Tendency.allInsightSentences(4);
    if (!insights.length) {
      return `
        <div class="section-head"><div class="section-title">Tendencies <span style="color:var(--text-mute); font-weight:600; font-size:11px;">BETA</span></div></div>
        <div class="insight-banner">${Utils.icon('sparkle')} Answer a few more Pick Ones and patterns will start showing up here \u2014 just for fun, not a personality test.</div>
      `;
    }
    return `
      <div class="section-head"><div class="section-title">Tendencies <span style="color:var(--text-mute); font-weight:600; font-size:11px;">BETA</span></div></div>
      ${insights.map(i => `
        <div class="insight-banner">${Utils.icon('sparkle')} ${i.text} <span style="color:var(--text-mute); margin-left:auto; font-size:11px;">${i.sample} choices</span></div>
      `).join('')}
      <div style="color:var(--text-mute); font-size:11px; margin-top:8px; padding:0 4px;">
        Based only on your own choices on this device. Not a personality test \u2014 just a pattern.
      </div>
    `;
  }

  function timeCapsuleSummaryTitle() {
    const ready = TimeCapsule.getReady().length;
    const total = TimeCapsule.getAll().length;
    if (ready > 0) return `${ready} ready to revisit`;
    if (total > 0) return `${total} saved`;
    return 'None saved yet';
  }

  function initialsFromStats() { return '?'; }

  // ---------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------
  function settings(root) {
    const s = Storage.getSettings();
    root.innerHTML = `
      <div class="screen">
        <div class="topbar">
          <button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button>
          <h1 style="font-size:18px;font-weight:900;">Settings</h1>
          <div style="width:40px;"></div>
        </div>

        <div class="settings-row">
          <div><div class="settings-label">Sound</div><div class="settings-sub">Subtle UI sounds</div></div>
          <div class="switch ${s.sound ? 'on' : ''}" id="sw-sound"><div class="knob"></div></div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Reduced motion</div><div class="settings-sub">Minimize animation</div></div>
          <div class="switch ${s.reducedMotion ? 'on' : ''}" id="sw-motion"><div class="knob"></div></div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Personalization</div><div class="settings-sub">Local-only tendency insights (beta)</div></div>
          <div class="switch ${s.personalization !== false ? 'on' : ''}" id="sw-personalization"><div class="knob"></div></div>
        </div>

        <div class="section-head"><div class="section-title">About</div></div>
        <div class="settings-row"><div class="settings-label">Install BETWEEN</div>
          <button class="btn btn-sm btn-ghost" id="btn-install">Install</button>
        </div>
        <div class="settings-row"><div><div class="settings-label">Privacy</div><div class="settings-sub">Your personal progress stays on this device. Majority votes are sent anonymously to build crowd results.</div></div></div>
        <div class="settings-row"><div><div class="settings-label">About BETWEEN</div><div class="settings-sub">V${BETWEEN_VERSION.app} \u00b7 360 experiences \u00b7 local-first \u00b7 PWA</div><div class="settings-sub" style="margin-top:5px;">Developed by ${BETWEEN_VERSION.creator}</div></div></div>

        <div class="section-head"><div class="section-title">Data</div></div>
        <div class="btn-row" style="margin-top:6px;">
          <button class="btn btn-ghost" id="btn-export">${Utils.icon('download')} Export</button>
          <button class="btn btn-ghost" id="btn-import">Import</button>
        </div>
        <div style="color:var(--text-mute); font-size:11px; margin: 8px 4px 16px;">
          Export saves your stats, history, Moments, and Time Capsules as a file you keep \u2014 useful before switching browsers or devices.
        </div>
        <button class="btn danger-btn btn-block" id="btn-reset">Reset local progress</button>
      </div>
    `;
    root.querySelector('#btn-back').addEventListener('click', () => App.back());
    root.querySelector('#sw-sound').addEventListener('click', (e) => {
      const on = Storage.updateSettings(x => x.sound = !x.sound).sound;
      e.currentTarget.classList.toggle('on', on);
      // A tiny preview makes the setting immediately understandable.
      if (on) Utils.tone('tap');
    });
    root.querySelector('#sw-motion').addEventListener('click', (e) => {
      const on = Storage.updateSettings(x => x.reducedMotion = !x.reducedMotion).reducedMotion;
      e.currentTarget.classList.toggle('on', on);
      document.documentElement.style.setProperty('--dur-fast', on ? '0.001ms' : '140ms');
    });
    root.querySelector('#sw-personalization').addEventListener('click', (e) => {
      const on = Storage.updateSettings(x => x.personalization = !x.personalization).personalization;
      e.currentTarget.classList.toggle('on', on !== false);
    });
    root.querySelector('#btn-install').addEventListener('click', () => App.promptInstall());
    root.querySelector('#btn-export').addEventListener('click', () => {
      Backup.exportData();
      toast('Exported. Check your downloads.');
    });
    root.querySelector('#btn-import').addEventListener('click', () => {
      Backup.promptImportFile((result) => {
        if (result.error) {
          confirmModal({
            title: 'Couldn\u2019t import that file',
            body: result.error,
            confirmLabel: 'OK',
            cancelLabel: 'Close',
            onConfirm: () => {},
          });
          return;
        }
        confirmModal({
          title: 'Replace your current data?',
          body: 'This will replace your current BETWEEN data \u2014 stats, history, Moments, and Time Capsules \u2014 with what\u2019s in this file. This can\u2019t be undone.',
          confirmLabel: 'Replace',
          danger: true,
          onConfirm: () => {
            Backup.importData(result.payload);
            toast('Data imported.');
            App.navigate('home', true);
          },
        });
      });
    });
    root.querySelector('#btn-reset').addEventListener('click', () => {
      confirmModal({
        title: 'Reset local progress?',
        body: 'This will erase your local BETWEEN history and stats. This can\u2019t be undone.',
        confirmLabel: 'Erase everything',
        danger: true,
        onConfirm: () => { Storage.resetAll(); App.navigate('home', true); }
      });
    });
  }

  // ---------------------------------------------------------------
  // EXPERIENCE SHELL
  // ---------------------------------------------------------------
  function experience(root, item, opts) {
    const meta = Engine.MODE_META[item.mode];
    const showMystery = !!opts.isMystery;

    root.innerHTML = `
      <div class="screen">
        <div class="topbar">
          <button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button>
          <span class="mode-chip" id="mode-chip" style="--chip-bg: var(--c-${showMystery ? 'mystery' : meta.color}-soft); --chip-fg: var(--c-${showMystery ? 'mystery' : meta.color})">
            ${showMystery ? '✨ MYSTERY' : meta.short}
          </span>
          <div class="topbar-right">
            <span class="progress-dot">${opts.progressLabel || ''}</span>
            <button class="icon-btn icon-btn-sm" id="btn-report" aria-label="Report this experience">${Utils.icon('flag')}</button>
            <button class="icon-btn icon-btn-sm" id="btn-save-moment" aria-label="Save this moment" disabled>${Utils.icon('bookmark')}</button>
          </div>
        </div>
        <div id="mode-mount"></div>
      </div>
    `;
    root.querySelector('#btn-back').addEventListener('click', () => App.exitExperience());
    root.querySelector('#btn-report').addEventListener('click', () => App.reportItem(item));

    const mount = root.querySelector('#mode-mount');
    Modes.render(mount, item, {
      isMystery: showMystery,
      reportResult: (result) => App.handleResult(item, result),
      next: () => App.advanceExperience(),
    });
  }

  // ---------------------------------------------------------------
  // SESSION END
  // ---------------------------------------------------------------
  function sessionEnd(root, summary) {
    root.innerHTML = `
      <div class="screen">
        <div class="exp-body">
          <div class="result-badge">🎉</div>
          <div class="result-title">THAT WAS YOUR ROUND.</div>
          <div class="result-sub">${summary.count} answered</div>
          <div class="result-stat-row">
            <div class="result-stat"><b>${summary.accuracy === null ? '—' : summary.accuracy + '%'}</b><span>Accuracy</span></div>
            <div class="result-stat"><b>${summary.longestStreak}</b><span>Best streak</span></div>
            <div class="result-stat"><b>${summary.modesPlayed}</b><span>Modes played</span></div>
          </div>
          <div style="margin-top:30px; display:flex; flex-direction:column; gap:12px;">
            <button class="btn btn-ghost" id="btn-share-round">Share result</button>
            <button class="btn btn-primary" id="btn-again">Go again</button>
            <button class="btn btn-ghost" id="btn-explore">Explore modes</button>
          </div>
        </div>
      </div>
    `;
    root.querySelector('#btn-share-round').addEventListener('click', async () => { const r = await ShareCards.share('That was your round.', [`${summary.count} answered`, `${summary.modesPlayed} modes played`, summary.accuracy === null ? 'Curiosity over correctness' : `${summary.accuracy}% knowledge accuracy`], 'My BETWEEN round'); toast(r === 'downloaded' ? 'Result card saved.' : 'Result ready to share.'); });
    root.querySelector('#btn-again').addEventListener('click', () => App.beginSession(summary.repeatOpts));
    root.querySelector('#btn-explore').addEventListener('click', () => App.navigate('modes'));
  }

  // ---------------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------------
  function confirmModal({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-title">${title}</div>
        <div class="modal-body">${body}</div>
        <div class="btn-row">
          <button class="btn btn-ghost" id="modal-cancel">${cancelLabel}</button>
          <button class="btn ${danger ? 'danger-btn' : 'btn-primary'}" id="modal-confirm">${confirmLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
    backdrop.querySelector('#modal-cancel').addEventListener('click', () => backdrop.remove());
    backdrop.querySelector('#modal-confirm').addEventListener('click', () => { backdrop.remove(); onConfirm(); });
  }

  function brandEasterEgg() {
    if (document.querySelector('.between-easter-egg')) return;
    const el = document.createElement('div');
    el.className = 'between-easter-egg';
    el.innerHTML = `${Utils.brandMark('easter-mark')}<span class="sr-only">BETWEEN</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  // ---------------------------------------------------------------
  // SAVE SHEET (Moments + Time Capsule) — opened from the bookmark icon
  // ---------------------------------------------------------------
  function markSaved(saveBtn) {
    saveBtn.classList.add('saved');
    saveBtn.innerHTML = Utils.icon('bookmarkFilled');
    saveBtn.disabled = true;
    saveBtn.setAttribute('aria-label', 'Saved');
  }

  function openSaveSheet(item, result, saveBtn) {
    const canCapsule = TimeCapsule.isEligible(item, result);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-title">Save this?</div>
        <div class="modal-body">Keep it in Your Moments, or add it to a Time Capsule to see if you'd still choose the same thing later.</div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button class="btn btn-ghost" id="save-moment-opt">${Utils.icon('bookmark')} Save to Your Moments</button>
          ${canCapsule ? `
            <button class="btn btn-ghost" data-capsule="30d">\u{1F55B} Time Capsule \u2014 revisit in 30 days</button>
            <button class="btn btn-ghost" data-capsule="1y">\u{1F55B} Time Capsule \u2014 revisit in 1 year</button>
            <button class="btn btn-ghost" data-capsule="whenever">\u{1F55B} Time Capsule \u2014 revisit whenever</button>
          ` : ''}
          <button class="btn btn-text" id="save-cancel">Never mind</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
    backdrop.querySelector('#save-cancel').addEventListener('click', () => backdrop.remove());
    backdrop.querySelector('#save-moment-opt').addEventListener('click', () => {
      Moments.save(item, result);
      markSaved(saveBtn);
      toast('Saved to Your Moments.');
      backdrop.remove();
    });
    backdrop.querySelectorAll('[data-capsule]').forEach(btn => {
      btn.addEventListener('click', () => {
        const period = btn.dataset.capsule;
        TimeCapsule.save(item, result, period);
        markSaved(saveBtn);
        const label = TimeCapsule.PERIODS[period].label;
        toast(`Added to your Time Capsule \u2014 revisit ${label}.`);
        backdrop.remove();
      });
    });
  }

  // ---------------------------------------------------------------
  // YOUR TIME CAPSULES
  // ---------------------------------------------------------------
  function timeCapsules(root) {
    const ready = TimeCapsule.getReady();
    const waiting = TimeCapsule.getWaiting();
    const done = TimeCapsule.getCompleted();
    const total = ready.length + waiting.length + done.length;

    root.innerHTML = `
      <div class="screen">
        <div class="topbar">
          <button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button>
          <h1 style="font-size:18px;font-weight:900;">Time Capsule</h1>
          <div style="width:40px;"></div>
        </div>
        ${total === 0 ? `
          <div class="empty-state">
            <div class="icon">\u{1F55B}</div>
            <div style="font-weight:800; font-size:15px; color:var(--text); margin-bottom:6px;">Nothing saved yet.</div>
            <div>After answering a Pick One, Scenario, Majority, or Prediction, tap the bookmark icon and choose "Time Capsule" to see if you'd still choose the same thing later.</div>
          </div>
        ` : `
          ${ready.length ? sectionBlock('Ready to revisit', ready.map(capsuleReadyHTML).join('')) : ''}
          ${waiting.length ? sectionBlock('Waiting', waiting.map(capsuleWaitingHTML).join('')) : ''}
          ${done.length ? sectionBlock('Completed', done.map(capsuleDoneHTML).join('')) : ''}
        `}
      </div>
    `;
    root.querySelector('#btn-back').addEventListener('click', () => App.back());

    root.querySelectorAll('[data-revisit]').forEach(btn => {
      btn.addEventListener('click', () => App.openCapsule(btn.dataset.revisit));
    });
    root.querySelectorAll('[data-delete-capsule]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteCapsule;
        confirmModal({
          title: 'Remove this Time Capsule?',
          body: 'This can\u2019t be undone.',
          confirmLabel: 'Remove',
          danger: true,
          onConfirm: () => { TimeCapsule.remove(id); timeCapsules(root); },
        });
      });
    });
  }

  function sectionBlock(title, html) {
    return `<div class="section-head"><div class="section-title">${title}</div></div>${html}`;
  }

  function capsuleReadyHTML(c) {
    return `
      <button class="mode-card" data-revisit="${c.id}">
        <div class="mode-card-icon" style="background:var(--surface-3);">\u{1F55B}</div>
        <div style="flex:1; min-width:0;">
          <div class="mode-card-title">${Utils.escapeHtml(truncate(c.prompt || '', 70))}</div>
          <div class="mode-card-sub">You said: ${Utils.escapeHtml(truncate(c.originalAnswer || '', 40))}</div>
        </div>
        <div class="mode-card-count" style="color:var(--c-knowledge);">Ready</div>
      </button>
    `;
  }

  function capsuleWaitingHTML(c) {
    const days = TimeCapsule.daysLeft(c);
    return `
      <div class="mode-card" style="cursor:default;">
        <div class="mode-card-icon" style="background:var(--surface-3); opacity:0.6;">\u{1F55B}</div>
        <div style="flex:1; min-width:0;">
          <div class="mode-card-title">${Utils.escapeHtml(truncate(c.prompt || '', 70))}</div>
          <div class="mode-card-sub">You said: ${Utils.escapeHtml(truncate(c.originalAnswer || '', 40))}</div>
        </div>
        <div class="mode-card-count">${Number(days) || 0}d left</div>
        <button class="icon-btn icon-btn-sm" data-delete-capsule="${c.id}" aria-label="Remove" style="opacity:0.4;">${Utils.icon('trash')}</button>
      </div>
    `;
  }

  function capsuleDoneHTML(c) {
    return `
      <div class="mode-card" style="cursor:default; align-items:flex-start;">
        <div class="mode-card-icon" style="background:var(--surface-3); margin-top:2px;">\u{1F55B}</div>
        <div style="flex:1; min-width:0;">
          <div class="mode-card-title">${Utils.escapeHtml(truncate(c.prompt || '', 70))}</div>
          <div class="mode-card-sub">Then: ${Utils.escapeHtml(truncate(c.originalAnswer || '', 40))}</div>
          <div class="mode-card-sub">Now: ${Utils.escapeHtml(truncate(c.newAnswer || '', 40))}</div>
          <div style="margin-top:6px; font-size:11px; font-weight:800; color:${c.sameChoice ? 'var(--c-knowledge)' : 'var(--c-scenario)'};">
            ${c.sameChoice ? '\u2713 Same choice' : '\u2192 You changed your mind'}
          </div>
        </div>
        <button class="icon-btn icon-btn-sm" data-delete-capsule="${c.id}" aria-label="Remove" style="opacity:0.4;">${Utils.icon('trash')}</button>
      </div>
    `;
  }

  // ---------------------------------------------------------------
  // TIME CAPSULE — REVISIT FLOW
  // ---------------------------------------------------------------
  function timeCapsuleRevisit(root, capsule) {
    if (!capsule) { App.navigate('timecapsules'); return; }
    const item = Engine.getItem(capsule.itemId);

    if (!item) {
      root.innerHTML = `
        <div class="screen">
          <div class="topbar">
            <button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button>
            <h1 style="font-size:18px;font-weight:900;">Time Capsule</h1>
            <div style="width:40px;"></div>
          </div>
          <div class="empty-state">
            <div style="font-weight:800; color:var(--text); margin-bottom:6px;">This question isn't available anymore.</div>
            <div>Your original answer is still saved, but the experience it came from has changed. You can remove this capsule from the list.</div>
          </div>
        </div>`;
      root.querySelector('#btn-back').addEventListener('click', () => App.back());
      return;
    }

    root.innerHTML = `
      <div class="screen">
        <div class="topbar">
          <button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button>
          <span class="mode-chip" style="--chip-bg: var(--c-${Engine.MODE_META[item.mode].color}-soft); --chip-fg: var(--c-${Engine.MODE_META[item.mode].color})">TIME CAPSULE</span>
          <div style="width:40px;"></div>
        </div>
        <div class="exp-body">
          <div class="exp-hint">You answered this on ${Utils.escapeHtml(TimeCapsule.fmtDate(capsule.dateKey))}.</div>
          <div class="exp-question small" style="margin-top:8px;">${Utils.escapeHtml(item.prompt)}</div>
          <div class="options-stack" id="opts" style="margin-top:24px;">
            ${item.options.map((opt, i) => `<button class="option-card" data-i="${i}">${Utils.escapeHtml(opt)}</button>`).join('')}
          </div>
          <div id="reveal-slot"></div>
        </div>
      </div>
    `;
    root.querySelector('#btn-back').addEventListener('click', () => App.back());

    root.querySelectorAll('.option-card').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.option-card').forEach(b => { b.disabled = true; if (b !== btn) b.classList.add('dim'); });
        const chosen = item.options[Number(btn.dataset.i)];
        btn.classList.add('selected');
        const result = TimeCapsule.open(capsule.id, chosen);

        setTimeout(() => {
          const slot = root.querySelector('#reveal-slot');
          slot.innerHTML = `
            <div class="reveal-card ${result.sameChoice ? 'pulse' : ''}">
              <div class="reveal-sub">Then, on ${Utils.escapeHtml(TimeCapsule.fmtDate(capsule.dateKey))}</div>
              <div class="reveal-answer" style="font-size:18px;">${Utils.escapeHtml(capsule.originalAnswer)}</div>
              <div class="reveal-sub" style="margin-top:14px;">Now</div>
              <div class="reveal-answer" style="font-size:18px;">${Utils.escapeHtml(chosen)}</div>
              <div style="margin-top:16px; font-weight:800; color:${result.sameChoice ? 'var(--c-knowledge)' : 'var(--c-scenario)'};">
                ${result.sameChoice ? '\u2713 Same choice.' : '\u2192 You changed your mind.'}
              </div>
            </div>
            <div class="next-cta">
              <button class="btn btn-primary" id="btn-capsule-done">Done</button>
            </div>
          `;
          root.querySelector('#btn-capsule-done').addEventListener('click', () => App.navigate('timecapsules'));
        }, 300);
      });
    });
  }

  // ---------------------------------------------------------------
  // PASS THE PHONE — setup, turn-by-turn play, and results
  // ---------------------------------------------------------------
  function ptpSetup(root) {
    root.innerHTML = `
      <div class="screen">
        <div class="topbar">
          <button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button>
          <h1 style="font-size:18px;font-weight:900;">Pass the Phone</h1>
          <div style="width:40px;"></div>
        </div>
        <p style="color:var(--text-dim); font-size:13px; margin-bottom:20px;">
          Two players, one phone. Nothing about either of you is saved individually \u2014 the match only exists while you're playing it.
        </p>
        <button class="mode-card" data-ptp-mode="same_answer" style="height:auto; padding:18px;">
          <div class="mode-card-icon" style="background:var(--c-pick_one-soft); color:var(--c-pick_one);">${Utils.icon('split')}</div>
          <div><div class="mode-card-title">Same Answer</div><div class="mode-card-sub">How often do you two agree?</div></div>
        </button>
        <button class="mode-card" data-ptp-mode="predict_me" style="height:auto; padding:18px;">
          <div class="mode-card-icon" style="background:var(--c-prediction-soft); color:var(--c-prediction);">${Utils.icon('eye')}</div>
          <div><div class="mode-card-title">Predict Me</div><div class="mode-card-sub">Can Player 2 guess what Player 1 picked?</div></div>
        </button>
      </div>
    `;
    root.querySelector('#btn-back').addEventListener('click', () => App.back());
    root.querySelectorAll('[data-ptp-mode]').forEach(btn => {
      btn.addEventListener('click', () => App.startPassThePhone(btn.dataset.ptpMode));
    });
  }

  function ptpTopbar(label) {
    return `
      <div class="topbar">
        <button class="icon-btn" id="btn-back" aria-label="Exit match">${Utils.icon('back')}</button>
        <span class="mode-chip" style="--chip-bg: var(--c-pick_one-soft); --chip-fg: var(--c-pick_one)">PASS THE PHONE</span>
        <span class="progress-dot">${label}</span>
      </div>
    `;
  }

  function ptpPlay(root, match, handlers) {
    const item = PassThePhone.currentItem(match);
    const roundLabel = `${match.roundIndex + 1}/${match.questions.length}`;

    if (match.phase === 'p1_turn' || match.phase === 'p2_turn') {
      const isP1 = match.phase === 'p1_turn';
      const heading = isP1
        ? 'Player 1 \u2014 your turn'
        : (match.gameMode === 'predict_me' ? 'Player 2 \u2014 predict Player 1' : 'Player 2 \u2014 your turn');
      const question = (!isP1 && match.gameMode === 'predict_me')
        ? `What do you think Player 1 chose?`
        : item.prompt;

      root.innerHTML = `
        <div class="screen">
          ${ptpTopbar(roundLabel)}
          <div class="exp-body">
            <div class="exp-category" style="color:var(--c-pick_one)">${heading}</div>
            <div class="exp-question small">${question}</div>
            ${(!isP1 && match.gameMode === 'predict_me') ? `<div class="exp-hint">${item.prompt}</div>` : ''}
            <div class="options-stack" style="margin-top:24px;">
              ${item.options.map((opt, i) => `<button class="option-card" data-i="${i}">${Utils.escapeHtml(opt)}</button>`).join('')}
            </div>
          </div>
        </div>
      `;
      root.querySelectorAll('.option-card').forEach(btn => {
        btn.addEventListener('click', () => handlers.onAnswer(item.options[Number(btn.dataset.i)]));
      });

    } else if (match.phase === 'handoff') {
      root.innerHTML = `
        <div class="screen">
          ${ptpTopbar(roundLabel)}
          <div class="exp-body" style="align-items:center; text-align:center;">
            <div style="font-size:40px; margin-bottom:16px;">\u{1F4F1}</div>
            <div class="exp-question small">Locked in.</div>
            <div class="exp-hint">Pass the phone to Player 2 \u2014 don't peek.</div>
            <div style="margin-top:28px; width:100%;">
              <button class="btn btn-primary" id="btn-handoff-ready">Player 2 is ready</button>
            </div>
          </div>
        </div>
      `;
      root.querySelector('#btn-handoff-ready').addEventListener('click', handlers.onHandoff);

    } else if (match.phase === 'reveal') {
      const r = match.results[match.results.length - 1];
      const isLast = match.roundIndex >= match.questions.length - 1;
      const label = match.gameMode === 'predict_me'
        ? (r.matched ? '\u2713 Correct guess!' : '\u2717 Not quite.')
        : (r.matched ? '\u2713 You agreed!' : '\u2717 You disagreed.');
      root.innerHTML = `
        <div class="screen">
          ${ptpTopbar(roundLabel)}
          <div class="exp-body">
            <div class="exp-question small">${item.prompt}</div>
            <div class="reveal-card" style="margin-top:22px;">
              <div class="reveal-sub">Player 1</div>
              <div class="reveal-answer" style="font-size:17px;">${r.p1Answer}</div>
              <div class="reveal-sub" style="margin-top:12px;">${match.gameMode === 'predict_me' ? "Player 2's guess" : 'Player 2'}</div>
              <div class="reveal-answer" style="font-size:17px;">${r.p2Answer}</div>
              <div style="margin-top:16px; font-weight:800; color:${r.matched ? 'var(--c-knowledge)' : 'var(--c-random)'};">${label}</div>
            </div>
            <div class="next-cta">
              <button class="btn btn-primary" id="btn-ptp-next">${isLast ? 'See results' : 'Next round'} \u2192</button>
            </div>
          </div>
        </div>
      `;
      root.querySelector('#btn-ptp-next').addEventListener('click', handlers.onNextRound);
    }

    const back = root.querySelector('#btn-back');
    if (back) back.addEventListener('click', handlers.onExit);
  }

  function ptpResults(root, match, handlers) {
    const { matches, total } = PassThePhone.score(match);
    const flavor = PassThePhone.flavorLine(match.gameMode, matches, total);
    const label = match.gameMode === 'predict_me' ? 'correct guesses' : 'agreements';

    root.innerHTML = `
      <div class="screen">
        <div class="exp-body">
          <div class="result-badge">\u{1F4F1}</div>
          <div class="result-title">${matches}/${total} ${label}</div>
          <div class="result-sub">${flavor}</div>
          <div style="margin-top:30px; display:flex; flex-direction:column; gap:12px;">
            <button class="btn btn-primary" id="btn-ptp-again">Play again</button>
            <button class="btn btn-ghost" id="btn-ptp-done">Done</button>
          </div>
        </div>
      </div>
    `;
    root.querySelector('#btn-ptp-again').addEventListener('click', handlers.onAgain);
    root.querySelector('#btn-ptp-done').addEventListener('click', handlers.onDone);
  }

  // ---------------------------------------------------------------
  // ERROR STATE (graceful fallback — never a blank screen)
  // ---------------------------------------------------------------
  function errorState(root, { onRetry }) {
    root.innerHTML = `
      <div class="screen">
        <div class="empty-state" data-error-state>
          <div class="icon">${Utils.icon('info')}</div>
          <div style="font-weight:800; font-size:17px; color:var(--text); margin-bottom:6px;">Something went sideways.</div>
          <div style="margin-bottom:20px;">That's on us, not you. Your progress is safe — it's saved on this device.</div>
          <button class="btn btn-primary" id="btn-retry">Try again</button>
        </div>
      </div>
    `;
    root.querySelector('#btn-retry').addEventListener('click', onRetry);
  }

  // ---------------------------------------------------------------
  // YOUR MOMENTS
  // ---------------------------------------------------------------
  function moments(root) {
    const all = Moments.getAll();

    root.innerHTML = `
      <div class="screen">
        <div class="topbar">
          <button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button>
          <h1 style="font-size:18px;font-weight:900;">Your Moments</h1>
          <div style="width:40px;"></div>
        </div>
        ${all.length === 0 ? momentsEmptyStateHTML() : `
          <p style="color:var(--text-dim); font-size:13px; margin-bottom:16px;">
            ${all.length} saved \u00b7 stored only on this device
          </p>
          <div id="moments-list">${all.map(momentCardHTML).join('')}</div>
        `}
      </div>
    `;
    root.querySelector('#btn-back').addEventListener('click', () => App.back());

    root.querySelectorAll('[data-delete-moment]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteMoment;
        confirmModal({
          title: 'Remove this Moment?',
          body: 'This only removes it from Your Moments \u2014 it won\u2019t affect your stats.',
          confirmLabel: 'Remove',
          danger: true,
          onConfirm: () => { Moments.remove(id); moments(root); },
        });
      });
    });
  }

  function momentsEmptyStateHTML() {
    return `
      <div class="empty-state">
        <div class="icon">${Utils.icon('bookmark')}</div>
        <div style="font-weight:800; font-size:15px; color:var(--text); margin-bottom:6px;">Nothing saved yet.</div>
        <div>After you answer something interesting, tap the bookmark icon at the top of the screen to keep it here.</div>
      </div>
    `;
  }

  function momentCardHTML(m) {
    const meta = Engine.MODE_META[m.mode] || { color: 'mystery', short: String(m.mode || '').toUpperCase(), icon: 'sparkle' };
    const line = m.chosenText || m.resultLabel || '\u2014';
    return `
      <div class="mode-card" style="cursor:default; align-items:flex-start;">
        <div class="mode-card-icon" style="background:var(--c-${meta.color}-soft); color:var(--c-${meta.color}); margin-top:2px;">${Utils.icon(meta.icon || 'sparkle')}</div>
        <div style="flex:1; min-width:0;">
          <div class="pick-mode-tag" style="--tag-fg: var(--c-${meta.color}); margin-bottom:4px;">${Utils.escapeHtml(meta.short)} \u00b7 ${Moments.fmtDate(m.dateKey)}</div>
          <div style="font-weight:700; font-size:14px; line-height:1.4;">${Utils.escapeHtml(truncate(m.prompt || '', 100))}</div>
          <div style="color:var(--text-dim); font-size:13px; margin-top:4px;">${Utils.escapeHtml(truncate(line, 90))}</div>
        </div>
        <button class="icon-btn icon-btn-sm" data-delete-moment="${m.id}" aria-label="Remove this moment" style="opacity:0.5; flex:0 0 auto;">${Utils.icon('trash')}</button>
      </div>
    `;
  }

  function openReportSheet(item, onSubmit) {
    const existing=document.getElementById('between-report-sheet'); if(existing) existing.remove();
    const el=document.createElement('div'); el.id='between-report-sheet'; el.className='modal-backdrop';
    el.innerHTML=`<div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><div class="confirm-title" id="report-title">Report this experience</div><div class="confirm-body">What needs attention? This report is saved locally for now.</div><div class="report-options">${Reports.REASONS.map(([v,l])=>`<label class="report-option"><input type="radio" name="report-reason" value="${v}"><span>${l}</span></label>`).join('')}</div><textarea id="report-note" class="report-note" maxlength="500" placeholder="Optional note"></textarea><div class="confirm-actions"><button class="btn btn-ghost" id="report-cancel">Cancel</button><button class="btn btn-primary" id="report-send">Save report</button></div></div>`;
    document.body.appendChild(el); el.querySelector('#report-cancel').onclick=()=>el.remove();
    el.querySelector('#report-send').onclick=()=>{const chosen=el.querySelector('input[name="report-reason"]:checked');if(!chosen){toast('Choose a reason first.');return;}onSubmit(chosen.value,el.querySelector('#report-note').value);el.remove();};
  }

  function packs(root) {
    const all=Packs.getAll();
    root.innerHTML=`<div class="screen"><div class="topbar"><button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button><h1 style="font-size:18px;font-weight:900;">Question Lab</h1><div style="width:40px"></div></div><p style="color:var(--text-dim);font-size:13px;">Private by default. Build your own mini experiences, keep them on this device, or share a pack link.</p><div class="btn-row"><button class="btn btn-primary" id="btn-new-pack">Create a pack</button><button class="btn btn-ghost" id="btn-import-pack">Import pack</button></div><div class="section-head"><div class="section-title">Your packs</div></div><div id="pack-list">${all.length?all.map(packCardHTML).join(''):`<div class="empty-state"><div class="icon">${Utils.icon('sparkle')}</div><div style="font-weight:800;color:var(--text);margin-bottom:6px;">Nothing here yet.</div><div>Create a small pack for friends, family, school, or future you.</div></div>`}</div></div>`;
    if (window.__BETWEEN_IMPORTED_PACK) { const importedTitle=window.__BETWEEN_IMPORTED_PACK; window.__BETWEEN_IMPORTED_PACK=null; setTimeout(()=>toast(`Added “${Utils.escapeHtml(importedTitle)}” to your Question Lab.`),0); }
    root.querySelector('#btn-back').onclick=()=>App.back(); root.querySelector('#btn-new-pack').onclick=()=>packEditor(root); root.querySelector('#btn-import-pack').onclick=()=>{const input=document.createElement('input');input.type='file';input.accept='application/json,.json';input.onchange=()=>{const f=input.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{try{Packs.importText(reader.result);packs(root);toast('Pack imported.');}catch(e){toast(e.message||'Could not import pack.');}};reader.readAsText(f);};input.click();};
    root.querySelectorAll('[data-play-pack]').forEach(b=>b.onclick=()=>playPack(Packs.getAll().find(p=>p.id===b.dataset.playPack)));
    root.querySelectorAll('[data-share-pack]').forEach(b=>b.onclick=async()=>{const p=Packs.getAll().find(x=>x.id===b.dataset.sharePack);try{const url=Packs.link(p);if(Capabilities.canShare)await navigator.share({title:p.title,text:`Play my BETWEEN pack: ${p.title}`,url});else{await navigator.clipboard?.writeText(url);toast('Pack link copied.');}}catch(e){}});
    root.querySelectorAll('[data-export-pack]').forEach(b=>b.onclick=()=>Packs.exportPack(Packs.getAll().find(x=>x.id===b.dataset.exportPack)));
    root.querySelectorAll('[data-delete-pack]').forEach(b=>b.onclick=()=>{Packs.remove(b.dataset.deletePack);packs(root);});
  }
  function packCardHTML(p){return `<div class="mode-card" style="align-items:flex-start"><div class="mode-card-icon" style="background:var(--c-random-soft);color:var(--c-random)">${Utils.icon('sparkle')}</div><div style="flex:1"><div class="mode-card-title">${Utils.escapeHtml(p.title)}</div><div class="mode-card-sub">${p.items.length} experiences${p.description?' · '+Utils.escapeHtml(p.description):''}</div><div class="btn-row" style="margin-top:10px"><button class="btn btn-sm btn-primary" data-play-pack="${p.id}">Play</button><button class="btn btn-sm btn-ghost" data-share-pack="${p.id}">Share</button><button class="btn btn-sm btn-ghost" data-export-pack="${p.id}">Export</button><button class="btn btn-sm danger-btn" data-delete-pack="${p.id}">Delete</button></div></div></div>`;}
  function packEditor(root){
    root.innerHTML=`<div class="screen"><div class="topbar"><button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button><h1 style="font-size:18px;font-weight:900;">Create a pack</h1><div style="width:40px"></div></div><label class="settings-label">Pack name<input class="estimate-input" id="pack-title" maxlength="80" placeholder="My Friends"></label><label class="settings-label" style="margin-top:14px">Description<input class="estimate-input" id="pack-desc" maxlength="240" placeholder="Questions for the group"></label><div id="custom-items"></div><button class="btn btn-ghost btn-block" id="add-item">+ Add experience</button><button class="btn btn-primary btn-block" id="save-pack" style="margin-top:12px">Save pack</button></div>`;
    root.querySelector('#btn-back').onclick=()=>packs(root); const items=[]; const mount=root.querySelector('#custom-items'); const add=()=>{if(items.length>=10){toast('Packs are capped at 10 custom experiences here.');return;} const n=items.length; const row=document.createElement('div');row.className='custom-pack-editor';row.innerHTML=`<div class="section-head"><div class="section-title">Experience ${n+1}</div></div><select class="pack-mode"><option value="pick_one">Pick One</option><option value="scenario">Scenario</option><option value="knowledge">Knowledge</option><option value="prediction">Prediction</option></select><input class="estimate-input pack-prompt" placeholder="Question or situation"><input class="estimate-input pack-cat" placeholder="Category" value="Custom"><input class="estimate-input pack-a" placeholder="Option A"><input class="estimate-input pack-b" placeholder="Option B"><select class="pack-answer"><option value="0">Knowledge answer: A</option><option value="1">Knowledge answer: B</option></select>`;mount.appendChild(row);items.push(row);}; add(); root.querySelector('#add-item').onclick=add; root.querySelector('#save-pack').onclick=()=>{const pack={title:root.querySelector('#pack-title').value,description:root.querySelector('#pack-desc').value,items:items.map((r,i)=>{const mode=r.querySelector('.pack-mode').value;const opts=[r.querySelector('.pack-a').value,r.querySelector('.pack-b').value];return {id:`custom_${Date.now()}_${i}`,mode,category:r.querySelector('.pack-cat').value,prompt:r.querySelector('.pack-prompt').value,options:opts,answer_index:mode==='knowledge'?Number(r.querySelector('.pack-answer').value):undefined,difficulty:'medium'};})};try{Packs.save(pack);packs(root);toast('Pack saved.');}catch(e){toast(e.message||'Could not save pack.');}};
  }
  function playPack(pack){if(!pack||!pack.items.length)return;App.beginSession({type:'pack',packItems:pack.items.slice(0,10),mode:null,firstItem:pack.items[0]});}
  function duelLanding(root){
    const ids=Engine.selectNext?Engine.ITEMS.filter(i=>['pick_one','scenario'].includes(i.mode)).slice(0,5):[];
    root.innerHTML=`<div class="screen"><div class="topbar"><button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button><h1 style="font-size:18px;font-weight:900;">Between Duel</h1><div style="width:40px"></div></div><div class="empty-state"><div class="icon">${Utils.icon('layers')}</div><div style="font-weight:900;font-size:18px;color:var(--text);margin-bottom:8px">Challenge someone.</div><div style="margin-bottom:20px">Answer a short set, then share a link. No accounts. The link contains only question IDs and your answers.</div><button class="btn btn-primary" id="btn-create-duel">Create challenge</button></div></div>`;root.querySelector('#btn-back').onclick=()=>App.back();root.querySelector('#btn-create-duel').onclick=()=>createDuel(root);}
  function createDuel(root){const qs=Engine.ITEMS.filter(i=>['pick_one','scenario'].includes(i.mode)&&Array.isArray(i.options)).sort(()=>Math.random()-.5).slice(0,5);let answers=[];let idx=0;const render=()=>{const q=qs[idx];root.innerHTML=`<div class="screen"><div class="topbar"><button class="icon-btn" id="btn-back" aria-label="Back">${Utils.icon('back')}</button><span class="mode-chip">DUEL ${idx+1}/${qs.length}</span><div></div></div><div class="exp-body"><div class="exp-question small">${Utils.escapeHtml(q.prompt)}</div><div class="options-stack">${q.options.map((o,i)=>`<button class="option-card" data-i="${i}">${Utils.escapeHtml(o)}</button>`).join('')}</div></div></div>`;root.querySelector('#btn-back').onclick=()=>App.navigate('duel');root.querySelectorAll('.option-card').forEach(b=>b.onclick=()=>{answers[idx]=Number(b.dataset.i);idx++;if(idx<qs.length)render();else{const token=btoa(JSON.stringify({v:1,ids:qs.map(q=>q.id),a:answers})).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');const url=`${location.origin}${location.pathname}?duel=${token}`;root.innerHTML=`<div class="screen"><div class="exp-body"><div class="result-badge">${Utils.icon('layers')}</div><div class="result-title">Challenge ready.</div><div class="result-sub">Send this link to your friend. They answer the same five questions and see where you agreed.</div><textarea class="share-link" readonly>${Utils.escapeHtml(url)}</textarea><button class="btn btn-primary btn-block" id="share-duel">Share challenge</button><button class="btn btn-ghost btn-block" id="copy-duel">Copy link</button></div></div>`;root.querySelector('#share-duel').onclick=async()=>{try{if(Capabilities.canShare)await navigator.share({title:'BETWEEN Duel',text:'I made you a BETWEEN challenge.',url});else{await navigator.clipboard?.writeText(url);toast('Link copied.');}}catch(e){}};root.querySelector('#copy-duel').onclick=async()=>{await navigator.clipboard?.writeText(url);toast('Link copied.');};}});};render();}

  function duelFromUrl(root, token){try{let s=token.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const d=JSON.parse(atob(s));const qs=d.ids.map(id=>Engine.getItem(id)).filter(Boolean);if(qs.length!==d.ids.length)throw new Error('Missing questions');let idx=0,answers=[];const render=()=>{const q=qs[idx];root.innerHTML=`<div class="screen"><div class="topbar"><span class="mode-chip">DUEL ${idx+1}/${qs.length}</span><div></div></div><div class="exp-body"><div class="exp-hint">Your friend already answered.</div><div class="exp-question small">${Utils.escapeHtml(q.prompt)}</div><div class="options-stack">${q.options.map((o,i)=>`<button class="option-card" data-i="${i}">${Utils.escapeHtml(o)}</button>`).join('')}</div></div></div>`;root.querySelectorAll('.option-card').forEach(b=>b.onclick=()=>{answers[idx]=Number(b.dataset.i);idx++;if(idx<qs.length)render();else{let m=0;qs.forEach((q,i)=>{if(Number(d.a[i])===answers[i])m++;});root.innerHTML=`<div class="screen"><div class="exp-body"><div class="result-badge">${m===qs.length?'🤝':'✨'}</div><div class="result-title">You agreed on ${m}/${qs.length}.</div><div class="result-sub">Compare the answers question by question — the interesting part is where you disagree.</div><button class="btn btn-primary btn-block" id="duel-share-result">Share result</button><button class="btn btn-ghost btn-block" id="duel-done">Done</button></div></div>`;root.querySelector('#duel-share-result').onclick=()=>ShareCards.share(`You agreed on ${m}/${qs.length}.`,['BETWEEN Duel','No accounts. No leaderboard. Just compare the choices.'],'BETWEEN Duel');root.querySelector('#duel-done').onclick=()=>App.navigate('home');}})};render();}catch(e){root.innerHTML=`<div class="screen"><div class="empty-state"><div style="font-weight:800;color:var(--text)">This challenge link is invalid or outdated.</div><button class="btn btn-primary" id="duel-home">Go home</button></div></div>`;root.querySelector('#duel-home').onclick=()=>App.navigate('home');}}

  return { packs, duelLanding, duelFromUrl, openReportSheet, home, modes, daily, profile, settings, experience, sessionEnd, confirmModal, toast, bindNav, bottomNav, errorState, moments, openSaveSheet, timeCapsules, timeCapsuleRevisit, ptpSetup, ptpPlay, ptpResults, brandEasterEgg };
})();
