// ===================== TIME CAPSULE =====================
// Save a real choice you made, then revisit it later and see whether you'd
// still choose the same thing. This never pretends BETWEEN "knows" anything
// about the future — it just stores what you answered and, when YOU choose to
// reopen it, asks you to answer again and honestly compares the two.
// Local-only. Nothing here is ever sent anywhere.

const TimeCapsule = (() => {

  const PERIODS = {
    '30d':     { label: 'in 30 days',  ms: 30 * 24 * 60 * 60 * 1000 },
    '1y':      { label: 'in 1 year',   ms: 365 * 24 * 60 * 60 * 1000 },
    'whenever': { label: 'whenever',   ms: null },
  };

  // Only experiences with a real, comparable stance are eligible — factual
  // (Knowledge), skill (Brain), and numeric-guess (Estimation) experiences
  // don't have a "would you choose the same thing again" shape.
  const ELIGIBLE_MODES = ['pick_one', 'scenario', 'majority', 'prediction'];

  function isEligible(item, result) {
    return ELIGIBLE_MODES.includes(item.mode) && !!result.chosenText;
  }

  function save(item, result, periodKey) {
    const period = PERIODS[periodKey] || PERIODS.whenever;
    const now = Date.now();
    const capsule = {
      id: 'capsule_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      itemId: item.id,
      mode: item.mode,
      category: item.category,
      prompt: item.prompt,
      originalAnswer: result.chosenText,
      dateKey: Utils.todayKey(),
      ts: now,
      periodKey: periodKey || 'whenever',
      revisitAt: period.ms ? now + period.ms : null,
      opened: false,
      newAnswer: null,
      openedTs: null,
      sameChoice: null,
    };
    Storage.updateTimeCapsules(arr => arr.push(capsule));
    return capsule;
  }

  function getAll() {
    return Storage.getTimeCapsules().slice().sort((a, b) => b.ts - a.ts);
  }

  function isReady(capsule) {
    if (capsule.opened) return false;
    if (capsule.revisitAt === null) return true; // "whenever" is always ready
    return Date.now() >= capsule.revisitAt;
  }

  function getReady() { return getAll().filter(c => !c.opened && isReady(c)); }
  function getWaiting() { return getAll().filter(c => !c.opened && !isReady(c)); }
  function getCompleted() { return getAll().filter(c => c.opened); }

  function daysLeft(capsule) {
    if (capsule.revisitAt === null) return null;
    const ms = capsule.revisitAt - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }

  function open(capsuleId, newAnswer) {
    let updated = null;
    Storage.updateTimeCapsules(arr => {
      const c = arr.find(x => x.id === capsuleId);
      if (!c) return;
      c.opened = true;
      c.newAnswer = newAnswer;
      c.openedTs = Date.now();
      c.sameChoice = (newAnswer === c.originalAnswer);
      updated = c;
    });
    return updated;
  }

  function remove(capsuleId) {
    Storage.updateTimeCapsules(arr => {
      const idx = arr.findIndex(c => c.id === capsuleId);
      if (idx > -1) arr.splice(idx, 1);
    });
  }

  function fmtDate(dateKey) {
    try {
      const d = new Date(dateKey + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return dateKey; }
  }

  return {
    PERIODS, ELIGIBLE_MODES, isEligible,
    save, getAll, isReady, getReady, getWaiting, getCompleted, daysLeft,
    open, remove, fmtDate,
  };
})();
