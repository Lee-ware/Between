// ===================== MOMENTS =====================
// A personal, local-only archive of experiences worth remembering.
// Deliberately NOT a social feed — nothing here is shared unless the person
// explicitly shares a single Moment later (share-card work is a separate,
// not-yet-built feature). This module only ever reads/writes this device's
// own storage.

const Moments = (() => {

  function save(item, result) {
    const moment = {
      id: 'moment_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      itemId: item.id,
      mode: item.mode,
      category: item.category,
      prompt: item.prompt,
      chosenText: result.chosenText || result.freetext || null,
      resultLabel: result.label || null,
      success: (result.success === undefined) ? null : result.success,
      dateKey: Utils.todayKey(),
      ts: Date.now(),
    };
    Storage.updateMoments(arr => arr.push(moment));
    return moment;
  }

  function getAll() {
    return Storage.getMoments().slice().sort((a, b) => b.ts - a.ts);
  }

  function count() {
    return Storage.getMoments().length;
  }

  function remove(momentId) {
    Storage.updateMoments(arr => {
      const idx = arr.findIndex(m => m.id === momentId);
      if (idx > -1) arr.splice(idx, 1);
    });
  }

  function fmtDate(dateKey) {
    try {
      const d = new Date(dateKey + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return dateKey; }
  }

  return { save, getAll, count, remove, fmtDate };
})();
