// ===================== TENDENCY (lightweight, local, non-diagnostic) =====================
// Tracks which "pole" of a small set of curated trade-off axes the person leans toward,
// based only on explicitly axis-tagged content (see data migration notes / CHANGELOG).
// This is intentionally NOT a personality test and makes no clinical or diagnostic claims.
// It only ever reflects back plain, hedged language like "You've leaned toward X lately."

const Tendency = (() => {

  const AXIS_LABELS = {
    freedom_security:      { a: 'freedom',      b: 'security' },
    money_time:             { a: 'money',        b: 'time' },
    risk_possibility:       { a: 'risk',         b: 'safety' },
    certainty_possibility:  { a: 'certainty',    b: 'possibility' },
    individual_group:       { a: 'individual',   b: 'group' },
    logic_emotion:          { a: 'logic',        b: 'emotion' },
    shortterm_longterm:     { a: 'the short term', b: 'the long term' },
    curiosity_comfort:      { a: 'curiosity',    b: 'comfort' },
  };
  // Map raw pole keys used in data.js to the two canonical display poles above.
  const POLE_ALIAS = {
    freedom: 'a', security: 'b',
    money: 'a', time: 'b',
    risk: 'a', safe: 'b',
    certainty: 'a', possibility: 'b',
    individual: 'a', group: 'b',
    logic: 'a', emotion: 'b',
    shortterm: 'a', longterm: 'b',
    curiosity: 'a', comfort: 'b',
  };

  function isEnabled() {
    return Storage.getSettings().personalization !== false;
  }

  // Called whenever an axis-tagged item is answered with a chosen option's text.
  function record(item, chosenOptionText) {
    if (!isEnabled()) return;
    if (!item.axis || !item.axis_map) return;
    const pole = item.axis_map[chosenOptionText];
    if (!pole) return;

    Storage.updateTendency(t => {
      t[item.axis] = t[item.axis] || {};
      t[item.axis][pole] = (t[item.axis][pole] || 0) + 1;
    });
  }

  const MIN_SAMPLE = 4; // don't say anything until there's enough signal

  // Returns an array of { axis, leadPole, label, count, total, ratio } for axes with enough data.
  function computeLeanings() {
    const t = Storage.getTendency();
    const out = [];
    for (const [axis, counts] of Object.entries(t)) {
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      if (total < MIN_SAMPLE) continue;
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const [leadPole, leadCount] = entries[0];
      const ratio = leadCount / total;
      if (ratio < 0.6) continue; // no clear lean yet — stay quiet rather than guess
      out.push({ axis, leadPole, count: leadCount, total, ratio });
    }
    return out;
  }

  function labelFor(axis, pole) {
    const canon = POLE_ALIAS[pole];
    const labels = AXIS_LABELS[axis];
    if (!labels || !canon) return null;
    return labels[canon];
  }

  function otherLabelFor(axis, pole) {
    const canon = POLE_ALIAS[pole];
    const labels = AXIS_LABELS[axis];
    if (!labels || !canon) return null;
    return canon === 'a' ? labels.b : labels.a;
  }

  // A single friendly, hedged sentence for Home/Profile, or null if not enough data yet.
  function topInsightSentence() {
    if (!isEnabled()) return null;
    const leanings = computeLeanings();
    if (!leanings.length) return null;
    leanings.sort((a, b) => b.ratio - a.ratio || b.total - a.total);
    const top = leanings[0];
    const lead = labelFor(top.axis, top.leadPole);
    const other = otherLabelFor(top.axis, top.leadPole);
    if (!lead || !other) return null;
    return `You've leaned toward ${lead} over ${other} lately.`;
  }

  function allInsightSentences(max = 4) {
    if (!isEnabled()) return [];
    const leanings = computeLeanings();
    leanings.sort((a, b) => b.ratio - a.ratio || b.total - a.total);
    return leanings.slice(0, max).map(l => {
      const lead = labelFor(l.axis, l.leadPole);
      const other = otherLabelFor(l.axis, l.leadPole);
      return { axis: l.axis, text: `You often choose ${lead} over ${other}.`, sample: l.total };
    }).filter(x => x.text.includes('undefined') === false);
  }

  return { record, computeLeanings, topInsightSentence, allInsightSentences, isEnabled };
})();
