// ===================== CROWD (real Majority-mode data) =====================
// Talks to the optional Netlify Function at /.netlify/functions/majority.
// This is entirely optional infrastructure: if it's not deployed yet, is
// slow, or errors out, every function here fails silently and Majority mode
// falls back to its existing honest "no benchmark yet" behavior. The rest of
// BETWEEN never depends on this module succeeding.

const Crowd = (() => {
  const ENDPOINT = '/.netlify/functions/majority';
  const TIMEOUT_MS = 2500;
  const MIN_FOR_ANY_RESULT = 20;   // fewer than this: say nothing rather than mislead
  const MIN_FOR_CONFIDENT = 100;   // fewer than this: show a result, but flag it as a small sample

  function withTimeout(promise, ms) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return { promise: promise(controller.signal), controller, clear: () => clearTimeout(timeout) };
  }

  async function fetchResults(itemId) {
    try {
      const { promise, clear } = withTimeout(
        (signal) => fetch(`${ENDPOINT}?id=${encodeURIComponent(itemId)}`, { signal, method: 'GET' }),
        TIMEOUT_MS
      );
      const res = await promise;
      clear();
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data.total !== 'number' || typeof data.counts !== 'object') return null;
      return data;
    } catch (e) {
      return null; // network error, timeout, function not deployed yet, CORS, etc. — all treated the same: unavailable
    }
  }

  async function submitVote(itemId, optionText) {
    try {
      const { promise, clear } = withTimeout(
        (signal) => fetch(ENDPOINT, {
          signal, method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: itemId, option: optionText }),
        }),
        TIMEOUT_MS
      );
      const res = await promise;
      clear();
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null; // same silent-degradation principle as fetchResults
    }
  }

  // One vote per question per device — a light, no-personal-data guard against
  // the most common accidental double-count (e.g. the item resurfacing later).
  function hasVoted(itemId) {
    return Storage.getCrowdVoted().includes(itemId);
  }
  function markVoted(itemId) {
    Storage.addCrowdVoted(itemId);
  }

  // Turns a raw {counts, total} into an honest, presentable summary.
  // Returns a tagged result so the caller can tell apart three genuinely
  // different situations rather than collapsing them into one vague message:
  //   - the server/feature is unreachable at all
  //   - it's reachable, but this question doesn't have enough votes yet
  //   - it's reachable and there's a real result to show
  function summarize(data) {
    if (!data) return { status: 'unavailable' };
    if (data.total < MIN_FOR_ANY_RESULT) return { status: 'insufficient', total: data.total };
    const entries = Object.entries(data.counts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return { status: 'insufficient', total: data.total };
    const [topOption, topCount] = entries[0];
    const pct = Math.round((topCount / data.total) * 100);
    return {
      status: 'ok',
      topOption, pct, total: data.total,
      smallSample: data.total < MIN_FOR_CONFIDENT,
    };
  }

  // The single entry point modes.js uses: vote once, then try to fetch a
  // result to show. Never throws, never blocks longer than TIMEOUT_MS.
  async function voteAndFetch(item, chosenText) {
    if (!hasVoted(item.id)) {
      // Submit in the background. Only mark the device as having voted after
      // the server accepts it, so a temporary outage does not permanently
      // consume this browser's one-vote allowance.
      submitVote(item.id, chosenText).then(result => {
        if (result && typeof result.total === 'number') markVoted(item.id);
      });
    }
    const data = await fetchResults(item.id);
    return summarize(data);
  }

  return { fetchResults, submitVote, hasVoted, markVoted, summarize, voteAndFetch };
})();
