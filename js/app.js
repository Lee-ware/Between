// ===================== APP CONTROLLER =====================

const App = (() => {
  const ROUND_LENGTH = 10;
  const root = () => document.getElementById('app');
  const TAB_SCREENS = ['home', 'modes', 'daily', 'profile', 'settings', 'moments', 'timecapsules', 'ptpsetup'];

  let singleFlow = null;      // { returnTo, dailyKey, dailyDateKey }
  let deferredInstallPrompt = null;
  let currentTab = 'home';    // last rendered top-level tab screen (back-navigation target)
  let renderGuard = false;    // prevents recursive error-boundary loops
  let activeCapsuleId = null; // capsule currently open in the revisit flow (in-memory only)
  let ptpMatch = null;        // in-progress Pass the Phone match (in-memory only, by design —
                               // see CHANGELOG_V3_PASSTHEPHONE.md for why this doesn't persist)

  // ---------------- Error boundary ----------------
  // Every screen render is wrapped so a bug in one mode/screen can never produce
  // a blank white page — the person always lands on a recognizable, recoverable state.
  function safeRender(fn, label) {
    try {
      fn();
    } catch (err) {
      console.error(`[BETWEEN] render failed (${label})`, err);
      if (renderGuard) return; // avoid loops if the error screen itself fails
      renderGuard = true;
      try {
        Screens.errorState(root(), {
          onRetry: () => { renderGuard = false; navigate('home'); },
        });
      } finally {
        renderGuard = false;
      }
    }
  }

  // ---------------- Navigation (with real back-stack support) ----------------
  function pushHistory(state, replace) {
    try {
      const method = replace ? 'replaceState' : 'pushState';
      history[method](state, '', '#' + state.screen);
    } catch (e) { /* history API unavailable in some embedded contexts — degrade silently */ }
  }

  function renderTabScreen(screen, fromPopstate) {
    if (!TAB_SCREENS.includes(screen)) screen = 'home';
    singleFlow = null;
    currentTab = screen;
    const r = root();
    safeRender(() => {
      switch (screen) {
        case 'home': Screens.home(r); break;
        case 'modes': Screens.modes(r); break;
        case 'daily': Screens.daily(r); break;
        case 'profile': Screens.profile(r); break;
        case 'settings': Screens.settings(r); break;
        case 'moments': Screens.moments(r); break;
        case 'timecapsules': Screens.timeCapsules(r); break;
        case 'ptpsetup': Screens.ptpSetup(r); break;
        default: Screens.home(r);
      }
    }, screen);
    if (!fromPopstate) pushHistory({ screen });
    window.scrollTo(0, 0);
  }

  function navigate(screen) { renderTabScreen(screen, false); }

  window.addEventListener('popstate', (e) => {
    const state = e.state || { screen: 'home' };
    if (state.screen === 'experience') {
      // Only reachable if the user navigated forward again after going back;
      // safest recovery is resuming the session if one still exists.
      const session = Storage.getSession();
      if (session) { renderExperience(Engine.getItem(session.currentItemId), session); return; }
      renderTabScreen('home', true);
      return;
    }
    if (state.screen === 'capsule-revisit') {
      // Only reachable via in-memory state (not persisted across a hard
      // refresh) — if it's gone, the list is the safest place to land.
      if (activeCapsuleId) {
        const capsule = TimeCapsule.getAll().find(c => c.id === activeCapsuleId);
        safeRender(() => Screens.timeCapsuleRevisit(root(), capsule), 'capsule-revisit');
        return;
      }
      renderTabScreen('timecapsules', true);
      return;
    }
    if (state.screen === 'ptp') {
      if (ptpMatch) { ptpRender(); return; }
      renderTabScreen('ptpsetup', true);
      return;
    }
    renderTabScreen(state.screen || 'home', true);
  });

  function openCapsule(id) {
    activeCapsuleId = id;
    const capsule = TimeCapsule.getAll().find(c => c.id === id);
    pushHistory({ screen: 'capsule-revisit' });
    safeRender(() => Screens.timeCapsuleRevisit(root(), capsule), 'capsule-revisit');
  }

  // ---------------- Pass the Phone ----------------
  function startPassThePhone(gameMode) {
    ptpMatch = PassThePhone.newMatch(gameMode);
    if (!ptpMatch.questions.length) { Screens.toast('Not enough questions available right now.'); return; }
    pushHistory({ screen: 'ptp' });
    ptpRender();
  }

  function ptpRender() {
    safeRender(() => {
      if (!ptpMatch) { navigate('ptpsetup'); return; }
      if (PassThePhone.isDone(ptpMatch)) {
        Screens.ptpResults(root(), ptpMatch, {
          onAgain: () => startPassThePhone(ptpMatch.gameMode),
          onDone: () => { ptpMatch = null; navigate('modes'); },
        });
      } else {
        Screens.ptpPlay(root(), ptpMatch, {
          onAnswer: (answer) => {
            if (ptpMatch.phase === 'p1_turn') PassThePhone.submitP1(ptpMatch, answer);
            else PassThePhone.submitP2(ptpMatch, answer);
            ptpRender();
          },
          onHandoff: () => { PassThePhone.confirmHandoff(ptpMatch); ptpRender(); },
          onNextRound: () => { PassThePhone.nextRound(ptpMatch); ptpRender(); },
          onExit: () => { ptpMatch = null; navigate('modes'); },
        });
      }
    }, 'ptp');
  }

  // ---------------- Session (round) management ----------------
  function newRoundState(type, mode) {
    return { type, mode: mode || null, count: 0, results: [] };
  }

  function pickForSession(session) {
    if (session.type === 'mode') {
      return Engine.selectNext({ mode: session.mode });
    }
    return Engine.surpriseMe();
  }

  function beginSession(opts) {
    const type = opts.type;
    const mode = opts.mode || null;
    const round = newRoundState(type, mode);
    const item = opts.firstItem || pickForSession({ type, mode });
    if (!item) { Screens.toast('Nothing to show right now.'); return; }

    Engine.recordShown(item);
    round.count = 1;

    const session = {
      type, mode,
      round,
      currentItemId: item.id,
      currentIsMystery: type === 'mystery' && opts.isMysteryFirst !== false,
      originTab: currentTab,
    };
    Storage.setSession(session);
    pushHistory({ screen: 'experience' });
    renderExperience(item, session);
  }

  function resumeSession() {
    const session = Storage.getSession();
    if (!session) { navigate('home'); return; }
    const item = Engine.getItem(session.currentItemId);
    if (!item) { Storage.clearSession(); navigate('home'); return; }
    pushHistory({ screen: 'experience' });
    renderExperience(item, session);
  }

  function renderExperience(item, session) {
    singleFlow = null;
    safeRender(() => {
      Screens.experience(root(), item, {
        isMystery: session.currentIsMystery,
        progressLabel: `#${session.round.count}`,
      });
    }, 'experience:' + (item && item.mode));
  }

  function startSingle(item, opts) {
    singleFlow = opts;
    Engine.recordShown(item);
    pushHistory({ screen: 'experience' });
    safeRender(() => {
      Screens.experience(root(), item, { isMystery: false, progressLabel: '' });
    }, 'experience-single:' + item.mode);
  }

  function exitExperience() {
    // Session (if any) stays persisted so "Continue" can resume it.
    // Real browser/back-gesture support: this pops back to whichever tab
    // (Home / Modes / Daily) the person actually came from.
    if (window.history.length > 1) {
      history.back();
    } else {
      navigate(currentTab || 'home');
    }
  }

  // ---------------- Result handling ----------------
  function handleResult(item, result) {
    Storage.updateStats(stats => {
      stats.answered += 1;
      Scoring.recordMode(stats, item.mode);
      Scoring.recordCategory(stats, item.category);
      Scoring.recordActiveDay(stats);

      if (result.success !== null && result.success !== undefined) {
        Scoring.bumpStreak(stats, result.success);
      }

      switch (item.mode) {
        case 'pick_one': stats.pickOneCount += 1; break;
        case 'scenario': stats.scenarioCount += 1; break;
        case 'knowledge':
          stats.totalKnowledge += 1;
          if (result.success) stats.correctKnowledge += 1;
          break;
        case 'majority':
          stats.majorityTotal += 1;
          break;
        case 'estimation':
          stats.estimationTotal += 1;
          if (typeof result.pctOff === 'number') {
            if (stats.closestEstimatePct === null || result.pctOff < stats.closestEstimatePct) {
              stats.closestEstimatePct = result.pctOff;
            }
          }
          break;
        case 'prediction': stats.predictionCount += 1; break;
        case 'random': stats.randomCount += 1; break;
        case 'brain':
          stats.brainCount += 1;
          if (result.success) stats.brainBestScore += 1;
          break;
      }
    });

    Storage.addHistory({ id: item.id, mode: item.mode, category: item.category, ts: Date.now(), success: result.success });

    if (result.chosenText) {
      Tendency.record(item, result.chosenText);
    }

    // Reveal the "save" affordance now that there's something to save.
    const saveBtn = document.getElementById('btn-save-moment');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.onclick = () => Screens.openSaveSheet(item, result, saveBtn);
    }

    const session = Storage.getSession();
    if (session && session.currentItemId === item.id) {
      session.round.results.push({ mode: item.mode, success: result.success });
      Storage.setSession(session);
    }
  }

  // ---------------- Advance ----------------
  function advanceExperience() {
    if (singleFlow) {
      if (singleFlow.dailyKey) {
        Engine.markDailyDone(singleFlow.dailyDateKey, singleFlow.dailyKey);
      }
      const returnTo = singleFlow.returnTo || 'home';
      singleFlow = null;
      // Replace, don't push: the "experience" history entry collapses back
      // into the tab we return to, rather than stacking another entry.
      pushHistory({ screen: returnTo }, true);
      renderTabScreen(returnTo, true);
      return;
    }

    let session = Storage.getSession();
    if (!session) { navigate('home'); return; }

    if (session.round.count >= ROUND_LENGTH) {
      finishRound(session);
      return;
    }

    const nextItem = pickForSession(session);
    if (!nextItem) { finishRound(session); return; }

    Engine.recordShown(nextItem);
    session.round.count += 1;
    session.currentItemId = nextItem.id;
    session.currentIsMystery = session.type === 'mystery';
    Storage.setSession(session);
    renderExperience(nextItem, session);
  }

  function finishRound(session) {
    const results = session.round.results;
    const graded = results.filter(r => r.success !== null && r.success !== undefined);
    const correct = graded.filter(r => r.success === true).length;
    const accuracy = graded.length ? Math.round((correct / graded.length) * 100) : null;

    let longest = 0, cur = 0;
    graded.forEach(r => {
      if (r.success) { cur += 1; longest = Math.max(longest, cur); } else { cur = 0; }
    });

    const modesPlayed = new Set(results.map(r => r.mode)).size;

    Storage.updateStats(stats => { stats.totalSessions += 1; });
    Storage.clearSession();

    safeRender(() => {
      Screens.sessionEnd(root(), {
        count: results.length,
        accuracy, longestStreak: longest, modesPlayed,
        repeatOpts: { type: session.type, mode: session.mode },
      });
    }, 'sessionEnd');
  }

  // ---------------- PWA install ----------------
  function promptInstall() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; });
    } else {
      Screens.toast('Use your browser\u2019s "Add to Home Screen" option.');
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(err => {
          console.warn('SW registration failed', err);
        });
      });
      // When a new service worker takes control (i.e. a fresh deploy was picked
      // up), let the person know a refresh will get them the latest version —
      // this prevents old, possibly-broken cached JS from lingering silently.
      let refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshed) return;
        refreshed = true;
        Screens.toast('Updated \u2014 refresh for the latest version.');
      });
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
    });
  }

  // ---------------- Keyboard shortcuts (optional, non-mandatory) ----------------
  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Enter') {
          const lockBtn = document.querySelector('#btn-lock:not([disabled]), #btn-lock2:not([disabled])');
          if (lockBtn) lockBtn.click();
        }
        return;
      }
      if (e.key === 'Escape') {
        const backBtn = document.querySelector('#btn-back');
        if (backBtn) backBtn.click();
      } else if (e.key === 'Enter') {
        const nextBtn = document.querySelector('#btn-next');
        if (nextBtn) nextBtn.click();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const opts = document.querySelectorAll('.big-option:not([disabled]), .option-card:not([disabled])');
        if (opts[idx]) opts[idx].click();
      }
    });
  }

  // ---------------- Content self-test (runs at boot; also exposed for QA) ----------------
  function runContentAudit() {
    const report = { itemCount: 0, dupIds: 0, dupPrompts: 0, missingFields: 0, byModeIssues: {} };
    try {
      const items = Engine.ITEMS;
      const ids = new Set();
      const prompts = new Set();
      report.itemCount = items.length;
      items.forEach(i => {
        if (ids.has(i.id)) report.dupIds++; ids.add(i.id);
        if (prompts.has(i.prompt)) report.dupPrompts++; prompts.add(i.prompt);
        if (!i.id || !i.mode || !i.category || !i.prompt) report.missingFields++;

        const flag = (msg) => {
          report.byModeIssues[i.mode] = report.byModeIssues[i.mode] || [];
          report.byModeIssues[i.mode].push(`${i.id}: ${msg}`);
        };
        if ((i.mode === 'pick_one' || i.mode === 'majority') && (!i.options || i.options.length !== 2)) {
          flag('expected exactly 2 options');
        }
        if (i.mode === 'knowledge') {
          if (!Array.isArray(i.options) || i.options.length !== 4) flag('expected 4 MCQ options');
          else if (new Set(i.options).size !== 4) flag('duplicate options');
          else if (i.options[i.answer_index] !== i.answer) flag('answer_index does not match answer');
        }
        if (i.mode === 'scenario' && (!i.options || i.options.length < 3)) flag('expected 3+ options');
        if (i.mode === 'estimation' && (typeof i.target !== 'number' || !i.unit)) flag('missing target/unit');
        if (i.mode === 'brain') {
          const SUPPORTED_GAME_TYPES = ['memory_sequence', 'spatial', 'pattern', 'attention_count', 'odd_tile', 'reaction', 'rapid_choice'];
          if (!i.game_type) flag('missing game_type (Brain items must declare an explicit mechanic)');
          else if (!SUPPORTED_GAME_TYPES.includes(i.game_type)) flag(`unsupported game_type "${i.game_type}"`);
        }
      });
      console.info(`[BETWEEN self-test] items=${report.itemCount} dupIds=${report.dupIds} dupPrompts=${report.dupPrompts} missingFields=${report.missingFields}`);
      const issueCount = Object.values(report.byModeIssues).reduce((a, arr) => a + arr.length, 0);
      if (issueCount) console.warn('[BETWEEN self-test] content issues:', report.byModeIssues);
      else console.info('[BETWEEN self-test] no structural content issues found');
    } catch (e) {
      console.warn('[BETWEEN self-test] failed', e);
      report.error = String(e);
    }
    window.BETWEEN_QA_REPORT = report;
    return report;
  }

  // ---------------- Boot ----------------
  function init() {
    runContentAudit();
    registerServiceWorker();
    bindKeyboard();

    // Last-resort net: catch anything that slips past individual render try/catches.
    window.addEventListener('error', () => {
      if (!document.querySelector('.empty-state[data-error-state]')) {
        safeRender(() => { throw new Error('uncaught'); }, 'window.onerror');
      }
    });

    const boot = document.getElementById('boot-screen');
    pushHistory({ screen: 'home' }, true);
    renderTabScreen('home', true);
    if (boot) {
      setTimeout(() => { boot.style.opacity = '0'; setTimeout(() => boot.remove(), 250); }, 260);
    }
  }

  return {
    init, navigate,
    beginSession, resumeSession, startSingle,
    exitExperience, handleResult, advanceExperience,
    promptInstall, runContentAudit, openCapsule, startPassThePhone,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
