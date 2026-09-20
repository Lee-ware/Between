// Local content reporting — reports are private until a real server submission exists.
const Reports = (() => {
  const REASONS = [
    ['incorrect_fact','Incorrect fact'],['broken','Broken question'],['bad_options','Bad options'],
    ['offensive','Offensive or inappropriate'],['repetitive','Too repetitive'],['confusing','Confusing'],['other','Other']
  ];
  function add(item, reason, note='') {
    const clean = String(note || '').trim().slice(0, 500);
    const id = `report_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
    const row = { id, itemId: item.id, mode: item.mode, category: item.category, reason, note: clean, dateKey: Utils.todayKey(), ts: Date.now() };
    Storage.updateReports(a => a.push(row));
    return row;
  }
  function hasReported(itemId) { return Storage.getReports().some(r => r.itemId === itemId); }
  return { REASONS, add, hasReported };
})();
