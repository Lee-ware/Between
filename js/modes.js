// ===================== MODE RENDERERS =====================
// Each render(container, item, ctx) draws the question UI into container.
// ctx = {
//   isMystery: bool,
//   reportResult(result): call ONCE when the answer is locked in.
//     result = { success: true|false|null, label, sub, deltaLabel }
//   next(): call when the user taps the Next / Continue button.
// }

const Modes = (() => {

  const REFLECTIONS = [
    "There's no single right call here — it just shows how you weigh things.",
    "Different people land in different places on this one.",
    "That says something about how you handle pressure.",
    "Reasonable people disagree on this constantly.",
    "That's a values call more than a right-or-wrong one.",
  ];

  function mysteryPrefix(ctx, item) {
    if (!ctx.isMystery) return '';
    const meta = Engine.MODE_META[item.mode];
    return `<div class="exp-hint" style="margin-bottom:14px;">✨ That was <b>${meta.label}</b>.</div>`;
  }

  function nextButtonHTML(label = 'Next') {
    return `
      <div class="next-cta">
        <button class="btn btn-primary" id="btn-next" data-icon-right="next">${label} →</button>
      </div>`;
  }

  function bindNext(container, ctx) {
    const btn = container.querySelector('#btn-next');
    if (btn) btn.addEventListener('click', () => ctx.next());
  }

  function vibrate(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  // ---------------------------------------------------------------
  // PICK ONE
  // ---------------------------------------------------------------
  function renderPickOne(container, item, ctx) {
    const opts = (item.options && item.options.length === 2) ? item.options : ['Option A', 'Option B'];

    container.innerHTML = `
      <div class="exp-body">
        <div class="exp-category">${item.category}</div>
        <div class="exp-question">${item.prompt}</div>
        <div class="two-up" id="opts">
          <button class="big-option" data-i="0">${opts[0]}</button>
          <div class="or-divider">or</div>
          <button class="big-option" data-i="1">${opts[1]}</button>
        </div>
        <div id="reveal-slot"></div>
      </div>
    `;

    container.querySelectorAll('.big-option').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.big-option').forEach(b => b.disabled = true);
        btn.classList.add('selected', 'pulse');
        vibrate(12);

        const chosenText = opts[Number(btn.dataset.i)];
        ctx.reportResult({ success: null, label: 'Locked in.', chosenText, item });

        setTimeout(() => {
          const slot = container.querySelector('#reveal-slot');
          slot.innerHTML = `
            ${mysteryPrefix(ctx, item)}
            <div class="reveal-card">
              <div class="reveal-sub" style="margin-bottom:6px;">Locked in.</div>
              <div class="reveal-answer">${chosenText}</div>
              <div class="reveal-sub" style="margin-top:10px;">${Utils.pick(REFLECTIONS)}</div>
            </div>
            ${nextButtonHTML()}
          `;
          bindNext(container, ctx);
        }, 260);
      });
    });
  }

  // ---------------------------------------------------------------
  // KNOWLEDGE — real multiple-choice with generated-but-plausible distractors
  // ---------------------------------------------------------------
  function renderKnowledge(container, item, ctx) {
    const letters = ['A', 'B', 'C', 'D'];
    const hasOptions = Array.isArray(item.options) && item.options.length === 4 && Number.isInteger(item.answer_index);

    if (!hasOptions) {
      // Defensive fallback for any malformed/legacy item — flashcard self-report.
      renderKnowledgeFlashcardFallback(container, item, ctx);
      return;
    }

    container.innerHTML = `
      <div class="exp-body">
        <div class="exp-category">${item.category} · Knowledge</div>
        <div class="exp-question">${item.prompt}</div>
        <div class="options-stack" id="opts">
          ${item.options.map((opt, i) => `
            <button class="option-card" data-i="${i}">
              <span class="opt-letter">${letters[i]}</span>${opt}
            </button>`).join('')}
        </div>
        <div id="reveal-slot"></div>
      </div>
    `;

    container.querySelectorAll('.option-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosenIdx = Number(btn.dataset.i);
        const success = chosenIdx === item.answer_index;
        container.querySelectorAll('.option-card').forEach(b => {
          b.disabled = true;
          const idx = Number(b.dataset.i);
          if (idx === item.answer_index) b.classList.add('correct');
          else if (idx === chosenIdx) b.classList.add('incorrect');
          else b.classList.add('dim');
        });
        vibrate(success ? 14 : 8);

        ctx.reportResult({
          success,
          label: success ? 'Correct' : 'Not quite',
          deltaLabel: success ? '+100' : null,
        });

        setTimeout(() => {
          const slot = container.querySelector('#reveal-slot');
          slot.innerHTML = `
            ${mysteryPrefix(ctx, item)}
            <div class="reveal-card ${success ? 'pulse' : ''}">
              <div class="reveal-answer" style="font-size:22px; color:${success ? '#17e0b0' : '#ff5c72'}">
                ${success ? 'Correct' : 'Not quite'}
              </div>
              ${!success ? `<div class="reveal-sub" style="margin-top:8px;">The answer was <b style="color:var(--text)">${item.answer}</b>.</div>` : ''}
            </div>
            ${nextButtonHTML()}
          `;
          bindNext(container, ctx);
        }, 320);
      });
    });
  }

  // Legacy fallback (kept for resilience against malformed content only — not used by the shipped dataset).
  function renderKnowledgeFlashcardFallback(container, item, ctx) {
    container.innerHTML = `
      <div class="exp-body">
        <div class="exp-category">${item.category} · Knowledge</div>
        <div class="exp-question">${item.prompt}</div>
        <div class="exp-hint">Think of your answer, then reveal.</div>
        <div style="margin-top:30px;">
          <button class="btn btn-primary" id="btn-reveal">Reveal answer</button>
        </div>
        <div id="reveal-slot"></div>
      </div>
    `;
    container.querySelector('#btn-reveal').addEventListener('click', () => {
      const slot = container.querySelector('#reveal-slot');
      slot.innerHTML = `
        <div class="reveal-card pulse">
          <div class="reveal-sub" style="margin-bottom:6px;">The answer is</div>
          <div class="reveal-answer">${item.answer}</div>
        </div>
        <div class="self-report-row">
          <button class="btn btn-ghost" id="btn-wrong">I got it wrong</button>
          <button class="btn btn-primary" id="btn-right">I got it right</button>
        </div>
        <div id="after-slot"></div>
      `;
      container.querySelector('#btn-reveal').remove();
      const finish = (success) => {
        container.querySelector('#btn-right').disabled = true;
        container.querySelector('#btn-wrong').disabled = true;
        ctx.reportResult({ success, label: success ? 'Correct' : 'Not quite', deltaLabel: success ? '+100' : null });
        container.querySelector('#after-slot').innerHTML = `${mysteryPrefix(ctx, item)}${nextButtonHTML()}`;
        bindNext(container, ctx);
      };
      container.querySelector('#btn-right').addEventListener('click', () => finish(true));
      container.querySelector('#btn-wrong').addEventListener('click', () => finish(false));
    });
  }

  // ---------------------------------------------------------------
  // SCENARIO
  // ---------------------------------------------------------------
  const SCENARIO_REFLECTIONS = [
    "That choice leans practical — get the facts, then act.",
    "That choice leans emotional — people matter more than process to you.",
    "That's a cautious move. Not wrong, just careful.",
    "That's a bold move. It says you trust your gut.",
    "Interesting — that's not the most common first instinct.",
  ];

  function renderScenario(container, item, ctx) {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    container.innerHTML = `
      <div class="exp-body">
        <div class="exp-category" style="color:var(--c-scenario)">THE SITUATION</div>
        <div class="exp-question small">${item.prompt}</div>
        <div class="options-stack" id="opts">
          ${item.options.map((opt, i) => `
            <button class="option-card" data-i="${i}">
              <span class="opt-letter">${letters[i]}</span>${opt}
            </button>`).join('')}
        </div>
        <div id="reveal-slot"></div>
      </div>
    `;

    container.querySelectorAll('.option-card').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.option-card').forEach(b => {
          b.disabled = true;
          if (b !== btn) b.classList.add('dim');
        });
        btn.classList.add('selected');
        vibrate(12);

        const chosen = item.options[Number(btn.dataset.i)];
        ctx.reportResult({ success: null, label: 'Choice locked.', chosenText: chosen, item });

        setTimeout(() => {
          const slot = container.querySelector('#reveal-slot');
          slot.innerHTML = `
            ${mysteryPrefix(ctx, item)}
            <div class="reveal-card">
              <div class="reveal-sub" style="margin-bottom:6px;">Choice locked.</div>
              <div class="reveal-sub">${Utils.pick(SCENARIO_REFLECTIONS)}</div>
            </div>
            ${nextButtonHTML()}
          `;
          bindNext(container, ctx);
        }, 260);
      });
    });
  }

  // ---------------------------------------------------------------
  // MAJORITY
  // ---------------------------------------------------------------
  function renderMajority(container, item, ctx) {
    const opts = (item.options && item.options.length === 2) ? item.options : ['Option A', 'Option B'];

    container.innerHTML = `
      <div class="exp-body">
        <div class="exp-category" style="color:var(--c-majority)">What would most people choose?</div>
        <div class="exp-question small">${opts[0]} <span style="color:var(--text-mute)">or</span> ${opts[1]}?</div>
        <div class="two-up" id="opts">
          <button class="big-option" data-i="0">${opts[0]}</button>
          <div class="or-divider">or</div>
          <button class="big-option" data-i="1">${opts[1]}</button>
        </div>
        <div id="reveal-slot"></div>
      </div>
    `;

    container.querySelectorAll('.big-option').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.big-option').forEach(b => b.disabled = true);
        btn.classList.add('selected', 'pulse');
        vibrate(12);
        const chosenText = opts[Number(btn.dataset.i)];

        ctx.reportResult({ success: null, label: 'Locked in.', chosenText, item });

        setTimeout(() => {
          const slot = container.querySelector('#reveal-slot');
          slot.innerHTML = `
            ${mysteryPrefix(ctx, item)}
            <div class="reveal-card">
              <div class="reveal-sub" style="margin-bottom:6px;">Locked in. You predicted</div>
              <div class="reveal-answer" style="font-size:20px;">${chosenText}</div>
              <div class="reveal-sub" id="crowd-status" style="margin-top:14px;">Checking what everyone else picked\u2026</div>
            </div>
            ${nextButtonHTML()}
          `;
          bindNext(container, ctx);

          // Real crowd data, if the optional server component is deployed and
          // reachable — otherwise this resolves to null and we say so honestly.
          // This never delays or blocks the Next button above.
          Crowd.voteAndFetch(item, chosenText).then(summary => {
            const statusEl = container.querySelector('#crowd-status');
            if (!statusEl) return; // user already moved on

            if (summary.status === 'unavailable') {
              statusEl.innerHTML = `\u{1F512} Crowd data unavailable right now \u2014 your prediction was still saved to your stats.`;
              return;
            }
            if (summary.status === 'insufficient') {
              statusEl.innerHTML = `\u{1F31F} Only ${summary.total} ${summary.total === 1 ? 'person has' : 'people have'} answered this one so far \u2014 not enough yet for a real percentage.`;
              return;
            }
            const youMatched = summary.topOption === chosenText;
            const sampleNote = summary.smallSample
              ? ` <span style="color:var(--text-mute);">(small sample so far \u2014 ${summary.total} answers)</span>`
              : ` <span style="color:var(--text-mute);">(${summary.total} answers)</span>`;
            statusEl.innerHTML = `
              \u{1F30D} ${summary.pct}% chose "${summary.topOption}"${sampleNote}<br/>
              <span style="font-weight:800; color:${youMatched ? 'var(--c-knowledge)' : 'var(--text)'};">
                ${youMatched ? 'You predicted the majority.' : 'You went against the majority.'}
              </span>
            `;
          });
        }, 260);
      });
    });
  }

  // ---------------------------------------------------------------
  // ESTIMATION — distance/accuracy score, never punished harshly
  // ---------------------------------------------------------------
  function renderEstimation(container, item, ctx) {
    container.innerHTML = `
      <div class="exp-body">
        <div class="exp-category">${item.category} · Estimation</div>
        <div class="exp-question">${item.prompt}</div>
        <div class="estimate-input-wrap">
          <input type="number" inputmode="decimal" class="estimate-input" id="est-input" placeholder="Your guess" />
          <div class="estimate-unit">${item.unit ? 'in ' + item.unit : ''}</div>
        </div>
        <div style="margin-top:22px;">
          <button class="btn btn-primary" id="btn-lock" disabled>Lock it in</button>
        </div>
        <div id="reveal-slot"></div>
      </div>
    `;

    const input = container.querySelector('#est-input');
    const lockBtn = container.querySelector('#btn-lock');
    input.addEventListener('input', () => { lockBtn.disabled = input.value.trim() === ''; });
    input.focus();

    lockBtn.addEventListener('click', () => {
      const guess = Number(input.value);
      input.disabled = true;
      lockBtn.disabled = true;

      const { pctOff, score } = Scoring.estimationAccuracy(guess, item.target);
      const feedback = Scoring.estimationFeedback(pctOff);
      // Estimation never produces a punitive "wrong" — only a distance/accuracy score.
      const success = pctOff <= 30 ? true : (pctOff > 100 ? false : null);

      ctx.reportResult({ success, label: feedback, deltaLabel: `${score} pts`, pctOff });

      const slot = container.querySelector('#reveal-slot');
      slot.innerHTML = `
        ${mysteryPrefix(ctx, item)}
        <div class="reveal-card pulse">
          <div class="reveal-sub">Your guess: <b style="color:var(--text)">${Utils.fmtNum(guess)} ${item.unit || ''}</b></div>
          <div class="reveal-sub">Actual: <b style="color:var(--text)">${Utils.fmtNum(item.target)} ${item.unit || ''}</b></div>
          <div class="reveal-answer" style="margin-top:10px;font-size:22px;">${pctOff < 1000 ? pctOff.toFixed(1) : Utils.fmtNum(Math.round(pctOff))}% off · ${score}/100</div>
          <div class="reveal-sub" style="margin-top:6px;">${feedback}</div>
        </div>
        ${nextButtonHTML()}
      `;
      bindNext(container, ctx);
    });
  }

  // ---------------------------------------------------------------
  // Shared: freetext reflection input (no scoring, no fake correctness)
  // ---------------------------------------------------------------
  function renderFreetext(container, item, ctx, accentVar, categoryLabel) {
    container.innerHTML = `
      <div class="exp-body">
        <div class="exp-category" style="color:${accentVar}">${categoryLabel}</div>
        <div class="exp-question small">${item.prompt}</div>
        <div class="estimate-input-wrap">
          <input type="text" maxlength="140" class="estimate-input" id="ft-input"
                 style="font-size:17px; text-align:left;" placeholder="Type your answer…" />
        </div>
        <div style="margin-top:22px;">
          <button class="btn btn-primary" id="btn-lock" disabled>Lock it in</button>
        </div>
        <div id="reveal-slot"></div>
      </div>
    `;
    const input = container.querySelector('#ft-input');
    const lockBtn = container.querySelector('#btn-lock');
    input.addEventListener('input', () => { lockBtn.disabled = input.value.trim() === ''; });
    input.focus();

    lockBtn.addEventListener('click', () => {
      const text = input.value.trim();
      input.disabled = true;
      lockBtn.disabled = true;
      ctx.reportResult({ success: null, label: 'Noted.', freetext: text });
      const slot = container.querySelector('#reveal-slot');
      slot.innerHTML = `
        ${mysteryPrefix(ctx, item)}
        <div class="reveal-card">
          <div class="reveal-sub" style="margin-bottom:6px;">You wrote</div>
          <div class="reveal-answer" style="font-size:18px;">“${Utils.escapeHtml(text)}”</div>
        </div>
        ${nextButtonHTML()}
      `;
      bindNext(container, ctx);
    });
  }

  // ---------------------------------------------------------------
  // PREDICTION — uses explicit prediction_shape from the content schema.
  // "Prediction locked." per spec; never fabricates a checkable outcome.
  // ---------------------------------------------------------------
  function renderPrediction(container, item, ctx) {
    const shape = item.prediction_shape || (item.options ? (item.options.length > 2 ? 'list' : 'binary') : 'open');

    if (shape === 'freetext') {
      renderFreetext(container, item, ctx, 'var(--c-prediction)', `${item.category} · Prediction`);
      return;
    }

    const finishWith = (chosenLabel) => {
      ctx.reportResult({ success: null, label: 'Prediction locked.', chosenText: chosenLabel, item });
      const slot = container.querySelector('#reveal-slot');
      slot.innerHTML = `
        ${mysteryPrefix(ctx, item)}
        <div class="reveal-card">
          <div class="reveal-sub" style="margin-bottom:6px;">Prediction locked.</div>
          <div class="reveal-answer" style="font-size:20px;">${chosenLabel}</div>
          <div class="reveal-sub" style="margin-top:10px;">We'll see how that ages.</div>
        </div>
        ${nextButtonHTML()}
      `;
      bindNext(container, ctx);
    };

    if (shape === 'binary' || shape === 'yesno') {
      const opts = item.options && item.options.length === 2 ? item.options : ['Yes', 'No'];
      container.innerHTML = `
        <div class="exp-body">
          <div class="exp-category" style="color:var(--c-prediction)">${item.category} · Prediction</div>
          <div class="exp-question small">${item.prompt}</div>
          <div class="two-up" id="opts">
            <button class="big-option" data-i="0">${opts[0]}</button>
            <div class="or-divider">or</div>
            <button class="big-option" data-i="1">${opts[1]}</button>
          </div>
          <div id="reveal-slot"></div>
        </div>`;
      container.querySelectorAll('.big-option').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.big-option').forEach(b => b.disabled = true);
          btn.classList.add('selected', 'pulse');
          finishWith(opts[Number(btn.dataset.i)]);
        });
      });
      return;
    }

    if (shape === 'list' && item.options) {
      container.innerHTML = `
        <div class="exp-body">
          <div class="exp-category" style="color:var(--c-prediction)">${item.category} · Prediction</div>
          <div class="exp-question small">${item.prompt}</div>
          <div class="options-stack" id="opts">
            ${item.options.map((opt, i) => `<button class="option-card" data-i="${i}">${opt}</button>`).join('')}
          </div>
          <div id="reveal-slot"></div>
        </div>`;
      container.querySelectorAll('.option-card').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.option-card').forEach(b => { b.disabled = true; if (b !== btn) b.classList.add('dim'); });
          btn.classList.add('selected');
          finishWith(item.options[Number(btn.dataset.i)]);
        });
      });
      return;
    }

    // Open reflective prediction — no clean checkable shape, just a beat of reflection.
    container.innerHTML = `
      <div class="exp-body">
        <div class="exp-category" style="color:var(--c-prediction)">${item.category} · Prediction</div>
        <div class="exp-question small">${item.prompt}</div>
        <div class="exp-hint">Hold your answer in your head — then continue.</div>
        <div style="margin-top:28px;">
          <button class="btn btn-primary" id="btn-lock2">Lock it in</button>
        </div>
        <div id="reveal-slot"></div>
      </div>`;
    container.querySelector('#btn-lock2').addEventListener('click', (e) => {
      e.target.remove();
      finishWith('Noted');
    });
  }

  // ---------------------------------------------------------------
  // RANDOM — uses explicit random_shape from the content schema.
  // ---------------------------------------------------------------
  function renderRandom(container, item, ctx) {
    const shape = item.random_shape || (item.options ? (item.options.length > 2 ? 'list' : 'binary') : 'open');

    if (shape === 'freetext') {
      renderFreetext(container, item, ctx, 'var(--c-random)', item.category);
      return;
    }

    const finishOpen = () => {
      ctx.reportResult({ success: null, label: 'Mission logged.' });
      const slot = container.querySelector('#reveal-slot');
      slot.innerHTML = `
        ${mysteryPrefix(ctx, item)}
        <div class="reveal-card">
          <div class="reveal-sub">Nice. Carry that into the next one.</div>
        </div>
        ${nextButtonHTML()}
      `;
      bindNext(container, ctx);
    };
    const finishChoice = (label) => {
      ctx.reportResult({ success: null, label: 'Locked in.', chosenText: label, item });
      const slot = container.querySelector('#reveal-slot');
      slot.innerHTML = `
        ${mysteryPrefix(ctx, item)}
        <div class="reveal-card">
          <div class="reveal-answer" style="font-size:20px;">${label}</div>
        </div>
        ${nextButtonHTML()}
      `;
      bindNext(container, ctx);
    };

    if (shape === 'list' && item.options) {
      container.innerHTML = `
        <div class="exp-body">
          <div class="exp-category" style="color:var(--c-random)">${item.category}</div>
          <div class="exp-question small">${item.prompt}</div>
          <div class="options-stack" id="opts">
            ${item.options.map((opt, i) => `<button class="option-card" data-i="${i}">${opt}</button>`).join('')}
          </div>
          <div id="reveal-slot"></div>
        </div>`;
      container.querySelectorAll('.option-card').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.option-card').forEach(b => { b.disabled = true; if (b !== btn) b.classList.add('dim'); });
          btn.classList.add('selected');
          finishChoice(item.options[Number(btn.dataset.i)]);
        });
      });
      return;
    }

    if ((shape === 'binary' || shape === 'yesno') && item.options) {
      const opts = item.options;
      container.innerHTML = `
        <div class="exp-body">
          <div class="exp-category" style="color:var(--c-random)">${item.category}</div>
          <div class="exp-question small">${item.prompt}</div>
          <div class="two-up" id="opts">
            <button class="big-option" data-i="0">${opts[0]}</button>
            <div class="or-divider">or</div>
            <button class="big-option" data-i="1">${opts[1]}</button>
          </div>
          <div id="reveal-slot"></div>
        </div>`;
      container.querySelectorAll('.big-option').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.big-option').forEach(x => x.disabled = true);
          btn.classList.add('selected', 'pulse');
          finishChoice(opts[Number(btn.dataset.i)]);
        });
      });
      return;
    }

    // Open mission / thought / rule — acknowledge and move on, no fake scoring.
    container.innerHTML = `
      <div class="exp-body">
        <div class="exp-category" style="color:var(--c-random)">${item.category}</div>
        <div class="exp-question small">${item.prompt}</div>
        <div style="margin-top:28px;">
          <button class="btn btn-primary" id="btn-done">Got it</button>
        </div>
        <div id="reveal-slot"></div>
      </div>`;
    container.querySelector('#btn-done').addEventListener('click', (e) => {
      e.target.remove();
      finishOpen();
    });
  }

  // ---------------------------------------------------------------
  // BRAIN — explicit game-type schema (Brain V2). Each item declares a
  // `game_type` and the renderer launches exactly that mechanic — no more
  // guessing from unreliable prose/hash fallback (that was the bug: an item
  // could promise "count the symbols" and launch a memory-sequence game).
  // If an item has no supported game_type, we say so honestly instead of
  // silently launching the wrong game.
  // ---------------------------------------------------------------
  const BRAIN_COLORS = ['#38d3ff', '#7c5cff', '#17e0b0', '#ff9d42', '#ff5c8a', '#ffd542'];
  const BRAIN_SYMBOLS = ['★', '●', '▲', '■', '◆', '✦'];

  const BRAIN_GAMES = {
    memory_sequence: runSequenceGame,   // watch an ordered flash, reproduce the exact order
    spatial:         runSpatialGame,    // watch several tiles flash at once, recall the SET (order doesn't matter)
    pattern:         runPatternGame,    // pick what comes next in a simple visual sequence
    attention_count: runAttentionCountGame, // count how many times a target symbol appears
    odd_tile:        runAttentionGame,  // spot the one tile that doesn't match (implemented, ready for future content)
    reaction:        runSpeedGame,      // pure reflex: tap the instant it turns green (implemented, ready for future content)
    rapid_choice:    runRapidChoiceGame, // answer a simple calculation before the timer runs out
  };

  function renderBrain(container, item, ctx) {
    const gameFn = BRAIN_GAMES[item.game_type];

    container.innerHTML = `
      <div class="exp-body">
        <div class="exp-category" style="color:var(--c-brain)">${item.category} · Brain</div>
        <div class="exp-question small">${item.prompt}</div>
        <div id="game-slot"></div>
        <div id="reveal-slot"></div>
      </div>
    `;

    if (!gameFn) {
      // Honest failure, per spec: never launch a mismatched or guessed game.
      const slot = container.querySelector('#game-slot');
      slot.innerHTML = `
        <div class="reveal-card" style="margin-top:26px;">
          <div class="reveal-sub">This Brain game isn't available yet on this device.</div>
        </div>
        ${nextButtonHTML('Skip')}
      `;
      bindNext(container, ctx);
      return;
    }

    gameFn(container, container.querySelector('#game-slot'), item, ctx);
  }

  function brainFinish(container, item, ctx, success, scoreText) {
    ctx.reportResult({ success, label: scoreText, deltaLabel: null, isBrain: true, scoreValue: success ? 1 : 0 });
    const slot = container.querySelector('#reveal-slot');
    slot.innerHTML = `
      ${mysteryPrefix(ctx, item)}
      <div class="reveal-card pulse">
        <div class="reveal-answer" style="font-size:20px;">${scoreText}</div>
      </div>
      ${nextButtonHTML()}
    `;
    bindNext(container, ctx);
  }

  // memory_sequence: flash tiles one at a time in order, user repeats the order.
  function runSequenceGame(container, slot, item, ctx) {
    const len = 5;
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 9));
    slot.innerHTML = `
      <div class="brain-status" id="status">Watch closely…</div>
      <div class="brain-grid" id="grid">
        ${Array.from({ length: 9 }).map((_, i) => `<button class="brain-tile" data-i="${i}" disabled></button>`).join('')}
      </div>
    `;
    const tiles = [...slot.querySelectorAll('.brain-tile')];
    let step = 0;

    function flashNext() {
      if (step >= seq.length) {
        slot.querySelector('#status').textContent = 'Your turn — repeat the sequence';
        tiles.forEach(t => { t.disabled = false; t.classList.remove('lit'); });
        armInput();
        return;
      }
      const idx = seq[step];
      tiles[idx].classList.add('lit');
      setTimeout(() => {
        tiles[idx].classList.remove('lit');
        step++;
        setTimeout(flashNext, 180);
      }, 420);
    }
    setTimeout(flashNext, 500);

    function armInput() {
      let userStep = 0;
      let failed = false;
      tiles.forEach(tile => {
        tile.addEventListener('click', () => {
          if (failed || userStep >= seq.length) return;
          const guess = Number(tile.dataset.i);
          if (guess === seq[userStep]) {
            tile.classList.add('lit');
            userStep++;
            if (userStep >= seq.length) {
              tiles.forEach(t => t.disabled = true);
              brainFinish(container, item, ctx, true, `Sequence nailed — ${len}/${len}.`);
            }
          } else {
            failed = true;
            tile.classList.add('wrong');
            tiles.forEach(t => t.disabled = true);
            brainFinish(container, item, ctx, false, `Got ${userStep}/${len} — close.`);
          }
        }, { once: false });
      });
    }
  }

  // spatial: flash SEVERAL tiles simultaneously, hide them, user selects the
  // same set back — order does not matter (this is what makes it genuinely
  // different from memory_sequence, matching "remember WHICH tiles" prompts).
  function runSpatialGame(container, slot, item, ctx) {
    const n = 9, litCount = 4;
    const litIndices = new Set();
    while (litIndices.size < litCount) litIndices.add(Math.floor(Math.random() * n));

    slot.innerHTML = `
      <div class="brain-status" id="status">Memorize the highlighted tiles…</div>
      <div class="brain-grid" id="grid">
        ${Array.from({ length: n }).map((_, i) => `<button class="brain-tile ${litIndices.has(i) ? 'lit' : ''}" data-i="${i}" disabled></button>`).join('')}
      </div>
    `;
    const tiles = [...slot.querySelectorAll('.brain-tile')];

    setTimeout(() => {
      tiles.forEach(t => t.classList.remove('lit'));
      slot.querySelector('#status').textContent = 'Tap the tiles that were highlighted';
      tiles.forEach(t => t.disabled = false);

      const picked = new Set();
      let done = false;
      tiles.forEach(tile => {
        tile.addEventListener('click', () => {
          if (done) return;
          const i = Number(tile.dataset.i);
          picked.add(i);
          tile.classList.add('lit');
          tile.disabled = true;
          if (picked.size === litCount) {
            done = true;
            tiles.forEach(t => t.disabled = true);
            const correct = [...litIndices].every(i => picked.has(i));
            // Mark misses in red for feedback before revealing the result.
            [...litIndices].forEach(i => { if (!picked.has(i)) tiles[i].classList.add('wrong'); });
            const matched = [...litIndices].filter(i => picked.has(i)).length;
            brainFinish(container, item, ctx, correct, correct ? `Nailed all ${litCount} tiles.` : `Got ${matched}/${litCount} tiles.`);
          }
        });
      });
    }, 1400);
  }

  // pattern: a simple numeric sequence with one blank; pick what comes next.
  function runPatternGame(container, slot, item, ctx) {
    const patterns = [
      { seq: [2, 4, 6, 8], answer: 10, opts: [9, 10, 12, 14] },
      { seq: [1, 2, 4, 8], answer: 16, opts: [10, 12, 16, 32] },
      { seq: [3, 6, 9, 12], answer: 15, opts: [13, 14, 15, 18] },
      { seq: [1, 4, 9, 16], answer: 25, opts: [20, 22, 25, 30] },
      { seq: [10, 8, 6, 4], answer: 2, opts: [0, 2, 3, 4] },
      { seq: [5, 10, 20, 40], answer: 80, opts: [45, 60, 80, 100] },
    ];
    const p = Utils.pick(patterns);
    const opts = Utils.shuffle(p.opts);

    slot.innerHTML = `
      <div class="brain-status">${p.seq.join('  →  ')}  →  <b style="color:var(--text)">?</b></div>
      <div class="options-stack" style="margin-top:20px;">
        ${opts.map(o => `<button class="option-card" data-v="${o}" style="text-align:center;">${o}</button>`).join('')}
      </div>
    `;
    const start = performance.now();
    slot.querySelectorAll('.option-card').forEach(btn => {
      btn.addEventListener('click', () => {
        slot.querySelectorAll('.option-card').forEach(b => b.disabled = true);
        const correct = Number(btn.dataset.v) === p.answer;
        btn.classList.add(correct ? 'correct' : 'incorrect');
        const ms = Math.round(performance.now() - start);
        brainFinish(container, item, ctx, correct, correct ? `That's the pattern — ${ms}ms.` : `Not quite — it was ${p.answer}.`);
      });
    });
  }

  // attention_count: show a grid of symbols, ask how many match the target.
  function runAttentionCountGame(container, slot, item, ctx) {
    const n = 12;
    const target = Utils.pick(BRAIN_SYMBOLS);
    const others = BRAIN_SYMBOLS.filter(s => s !== target);
    let trueCount = 0;
    const symbols = Array.from({ length: n }, () => {
      if (Math.random() < 0.4) { trueCount++; return target; }
      return Utils.pick(others);
    });
    if (trueCount === 0) { symbols[0] = target; trueCount = 1; } // never a trick zero

    const choices = new Set([trueCount]);
    while (choices.size < 4) {
      const d = trueCount + Utils.pick([-2, -1, 1, 2]);
      if (d >= 0) choices.add(d);
    }
    const opts = Utils.shuffle([...choices]);

    slot.innerHTML = `
      <div class="brain-status">How many <span style="color:var(--c-brain); font-size:18px;">${target}</span> do you see?</div>
      <div class="brain-grid" style="grid-template-columns:repeat(4,1fr);">
        ${symbols.map(s => `<div class="brain-tile" style="display:flex;align-items:center;justify-content:center;font-size:20px;cursor:default;">${s}</div>`).join('')}
      </div>
      <div class="options-stack" style="margin-top:18px;">
        ${opts.map(o => `<button class="option-card" data-v="${o}" style="text-align:center;">${o}</button>`).join('')}
      </div>
    `;
    slot.querySelectorAll('.option-card').forEach(btn => {
      btn.addEventListener('click', () => {
        slot.querySelectorAll('.option-card').forEach(b => b.disabled = true);
        const correct = Number(btn.dataset.v) === trueCount;
        btn.classList.add(correct ? 'correct' : 'incorrect');
        brainFinish(container, item, ctx, correct, correct ? `Correct — ${trueCount} of them.` : `It was ${trueCount}.`);
      });
    });
  }

  // odd_tile: spot the one tile that doesn't match. Implemented and ready —
  // no shipped content currently targets this type, but future items can.
  function runAttentionGame(container, slot, item, ctx) {
    const n = 9;
    const oddIndex = Math.floor(Math.random() * n);
    const base = Utils.pick(BRAIN_COLORS);
    slot.innerHTML = `
      <div class="brain-status">Find the tile that doesn't match</div>
      <div class="brain-grid" id="grid">
        ${Array.from({ length: n }).map((_, i) =>
          `<button class="brain-tile" data-i="${i}" style="background:${i === oddIndex ? shade(base, 0.35) : base}; border-color:${i === oddIndex ? shade(base, 0.35) : base}"></button>`
        ).join('')}
      </div>
    `;
    const start = performance.now();
    slot.querySelectorAll('.brain-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        slot.querySelectorAll('.brain-tile').forEach(t => t.disabled = true);
        const correct = Number(tile.dataset.i) === oddIndex;
        const ms = Math.round(performance.now() - start);
        brainFinish(container, item, ctx, correct, correct ? `Spotted it in ${ms}ms.` : `Not quite — that took ${ms}ms.`);
      });
    });
  }

  function shade(hex, amt) {
    const c = hex.replace('#', '');
    const num = parseInt(c, 16);
    let r = (num >> 16) + Math.round(255 * amt);
    let g = ((num >> 8) & 0xff) + Math.round(255 * amt);
    let b = (num & 0xff) + Math.round(255 * amt);
    r = Utils.clamp(r, 0, 255); g = Utils.clamp(g, 0, 255); b = Utils.clamp(b, 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  // reaction: pure reflex, tap the instant it turns green. Implemented and
  // ready — no shipped content currently targets this type.
  function runSpeedGame(container, slot, item, ctx) {
    slot.innerHTML = `<div class="reaction-zone" id="zone">Wait for green…</div>`;
    const zone = slot.querySelector('#zone');
    let state = 'waiting';
    let goAt = 0;

    const delay = 1200 + Math.random() * 1800;
    const timer = setTimeout(() => {
      state = 'go';
      goAt = performance.now();
      zone.classList.add('go');
      zone.textContent = 'TAP NOW';
    }, delay);

    zone.addEventListener('click', () => {
      if (state === 'waiting') {
        clearTimeout(timer);
        zone.classList.add('tooSoon');
        zone.textContent = 'Too soon!';
        setTimeout(() => brainFinish(container, item, ctx, false, 'Jumped the gun — too soon.'), 500);
        state = 'done';
      } else if (state === 'go') {
        const ms = Math.round(performance.now() - goAt);
        state = 'done';
        brainFinish(container, item, ctx, ms < 400, `Reaction time: ${ms}ms.`);
      }
    });
  }

  // rapid_choice: a simple calculation, answer before the timer runs out.
  function runRapidChoiceGame(container, slot, item, ctx) {
    const a = 2 + Math.floor(Math.random() * 12);
    const b = 2 + Math.floor(Math.random() * 12);
    const op = Utils.pick(['+', '-', '×']);
    const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
    const choices = new Set([answer]);
    while (choices.size < 4) {
      const d = answer + Utils.pick([-3, -2, -1, 1, 2, 3]);
      choices.add(d);
    }
    const opts = Utils.shuffle([...choices]);
    const TIME_MS = 6000;

    slot.innerHTML = `
      <div class="brain-status" style="font-size:22px; font-weight:900; color:var(--text);">${a} ${op} ${b} = ?</div>
      <div style="height:4px; background:var(--surface-3); border-radius:4px; margin:14px 0 4px; overflow:hidden;">
        <div id="rc-bar" style="height:100%; width:100%; background:var(--c-brain); transition: width ${TIME_MS}ms linear;"></div>
      </div>
      <div class="options-stack" style="margin-top:14px;">
        ${opts.map(o => `<button class="option-card" data-v="${o}" style="text-align:center;">${o}</button>`).join('')}
      </div>
    `;
    requestAnimationFrame(() => { slot.querySelector('#rc-bar').style.width = '0%'; });

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      slot.querySelectorAll('.option-card').forEach(b => b.disabled = true);
      brainFinish(container, item, ctx, false, `Time's up — it was ${answer}.`);
    }, TIME_MS);

    slot.querySelectorAll('.option-card').forEach(btn => {
      btn.addEventListener('click', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        slot.querySelectorAll('.option-card').forEach(b => b.disabled = true);
        const correct = Number(btn.dataset.v) === answer;
        btn.classList.add(correct ? 'correct' : 'incorrect');
        brainFinish(container, item, ctx, correct, correct ? 'Correct!' : `Not quite — it was ${answer}.`);
      });
    });
  }

  // ---------------------------------------------------------------
  const RENDERERS = {
    pick_one: renderPickOne,
    knowledge: renderKnowledge,
    scenario: renderScenario,
    majority: renderMajority,
    estimation: renderEstimation,
    prediction: renderPrediction,
    random: renderRandom,
    brain: renderBrain,
  };

  function render(container, item, ctx) {
    const fn = RENDERERS[item.mode];
    if (!fn) {
      container.innerHTML = `<div class="empty-state">Unsupported mode.</div>`;
      return;
    }
    fn(container, item, ctx);
  }

  return { render };
})();
