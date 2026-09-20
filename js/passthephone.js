// ===================== PASS THE PHONE =====================
// Same-device, two-player mode. No accounts, no backend, no data leaves the
// device, nothing about either player is identified or stored individually —
// a match exists only in memory while it's being played. Deliberately kept
// to two simple game types rather than four, per the brief's own instruction
// not to overcomplicate this: "Debate" is mechanically identical to
// "Same Answer" (both answer blind, then compare), and "Chaos" would need
// its own content design rather than reusing existing questions — both are
// listed as backlog rather than built shallow.

const PassThePhone = (() => {
  const ROUND_COUNT = 5;
  const ELIGIBLE_MODES = ['pick_one', 'scenario', 'majority'];

  function pickQuestions(n) {
    const pool = Engine.ITEMS.filter(i =>
      ELIGIBLE_MODES.includes(i.mode) && Array.isArray(i.options) && i.options.length >= 2
    );
    const shuffled = Utils.shuffle(pool);
    return shuffled.slice(0, Math.min(n, shuffled.length));
  }

  // gameMode: 'same_answer' (do you pick the same thing?) or
  //           'predict_me'  (can Player 2 guess what Player 1 picked?)
  function newMatch(gameMode) {
    return {
      gameMode,
      questions: pickQuestions(ROUND_COUNT),
      roundIndex: 0,
      phase: 'p1_turn', // p1_turn -> handoff -> p2_turn -> reveal -> (next round | done)
      p1Answer: null,
      p2Answer: null,
      results: [],
    };
  }

  function currentItem(match) { return match.questions[match.roundIndex]; }

  function submitP1(match, answer) {
    match.p1Answer = answer;
    match.phase = 'handoff';
  }

  function confirmHandoff(match) {
    match.phase = 'p2_turn';
  }

  function submitP2(match, answer) {
    const item = currentItem(match);
    const matched = answer === match.p1Answer; // "matched" means agreed (same_answer) or guessed right (predict_me)
    match.p2Answer = answer;
    match.results.push({ itemId: item.id, prompt: item.prompt, p1Answer: match.p1Answer, p2Answer: answer, matched });
    match.phase = 'reveal';
  }

  function nextRound(match) {
    match.roundIndex += 1;
    match.p1Answer = null;
    match.p2Answer = null;
    match.phase = (match.roundIndex >= match.questions.length) ? 'done' : 'p1_turn';
  }

  function isDone(match) { return match.phase === 'done'; }

  function score(match) {
    const matches = match.results.filter(r => r.matched).length;
    return { matches, total: match.results.length };
  }

  function flavorLine(gameMode, matches, total) {
    const ratio = total ? matches / total : 0;
    if (gameMode === 'predict_me') {
      if (ratio >= 0.8) return 'You really do know them.';
      if (ratio >= 0.5) return "That's a solid read on them.";
      return "They're harder to predict than you thought.";
    }
    if (ratio === 1) return 'You agreed on everything.';
    if (ratio >= 0.6) return 'You think alike more often than not.';
    if (ratio >= 0.3) return 'You see things pretty differently.';
    return "You barely agreed on anything — that's kind of impressive.";
  }

  return {
    ROUND_COUNT, newMatch, currentItem,
    submitP1, confirmHandoff, submitP2, nextRound, isDone, score, flavorLine,
  };
})();
