(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /** English CISSP CAT: 3 hours for up to 150 items (official length reference). */
  const CISSP_CAT_MINUTES = 180;
  const CISSP_CAT_MAX_QUESTIONS = 150;
  /** CAT max length — used for “exam-length” full-exam sample mode. */
  const FULL_EXAM_CAT_SAMPLE = 150;

  const COUNT_PRESETS = [10, 20, 50, 100];

  const views = {
    landing: $("#view-landing"),
    fullSetup: $("#view-full-setup"),
    setup: $("#view-setup"),
    quiz: $("#view-quiz"),
    results: $("#view-results"),
  };

  let state = {
    domainId: null,
    quizMode: "domain",
    questionDomains: null,
    answerRecord: [],
    questions: [],
    index: 0,
    score: 0,
    shuffled: null,
    answered: false,
    timerId: null,
    timerEnd: null,
    timedOut: false,
    timeExpired: false,
    selectedPreset: 10,
  };

  function secondsForQuestionCount(n) {
    return Math.ceil((n * CISSP_CAT_MINUTES * 60) / CISSP_CAT_MAX_QUESTIONS);
  }

  function formatClock(totalSec) {
    const s = Math.max(0, Math.floor(totalSec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildShuffle(question) {
    const indices = question.choices.map((_, i) => i);
    const order = shuffle(indices);
    const choices = order.map((i) => question.choices[i]);
    const correct = order.indexOf(question.correct);
    return { choices, correct };
  }

  function showView(name) {
    Object.values(views).forEach((el) => el.setAttribute("hidden", ""));
    views[name].removeAttribute("hidden");
  }

  function clearQuizTimer() {
    if (state.timerId != null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    state.timerEnd = null;
  }

  function tickTimer() {
    if (!state.timerEnd) return;
    const left = Math.max(0, Math.ceil((state.timerEnd - Date.now()) / 1000));
    const el = $("#quiz-timer");
    el.textContent = formatClock(left);
    el.classList.toggle("timer-warning", left <= 300 && left > 60);
    el.classList.toggle("timer-critical", left <= 60);
    el.setAttribute("aria-label", `Time remaining: ${formatClock(left)}`);
    if (left <= 0) {
      state.timedOut = true;
      state.timeExpired = true;
      clearQuizTimer();
      showResults();
    }
  }

  function startQuizTimer(totalSeconds) {
    clearQuizTimer();
    state.timerEnd = Date.now() + totalSeconds * 1000;
    tickTimer();
    state.timerId = setInterval(tickTimer, 250);
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function poolForDomain(domainId) {
    const pool = QUESTIONS[domainId];
    return pool && pool.length ? pool : [];
  }

  function buildFullExamPairs() {
    const pairs = [];
    CISSP_DOMAINS.forEach((d) => {
      poolForDomain(d.id).forEach((q) => {
        pairs.push({ q, domainId: d.id });
      });
    });
    return pairs;
  }

  function getFullPoolSize() {
    return buildFullExamPairs().length;
  }

  function openFullSetup() {
    const total = getFullPoolSize();
    const sampleN = Math.min(FULL_EXAM_CAT_SAMPLE, total);
    const secSample = secondsForQuestionCount(sampleN);
    $("#full-setup-summary").textContent = `Each run draws ${sampleN} random questions from the combined bank (${total} total across all eight domains), shuffled.`;
    $("#full-setup-timer").textContent = `Timer for this run: ${formatClock(secSample)} (${sampleN} questions × ~${Math.round((CISSP_CAT_MINUTES * 60) / CISSP_CAT_MAX_QUESTIONS)}s each, scaled from the 3 hr / 150-question CAT reference).`;
    showView("fullSetup");
  }

  function startFullExam() {
    let pairs = shuffle(buildFullExamPairs());
    if (!pairs.length) return;
    const n = Math.min(FULL_EXAM_CAT_SAMPLE, pairs.length);
    pairs = pairs.slice(0, n);
    clearQuizTimer();
    state = {
      domainId: "full",
      quizMode: "full",
      questionDomains: pairs.map((p) => p.domainId),
      answerRecord: [],
      questions: pairs.map((p) => p.q),
      index: 0,
      score: 0,
      shuffled: null,
      answered: false,
      timerId: null,
      timerEnd: null,
      timedOut: false,
      timeExpired: false,
      selectedPreset: null,
    };
    state.shuffled = state.questions.map((q) => buildShuffle(q));

    $("#quiz-domain-label").textContent = `CAT-length practice — ${state.questions.length} questions (all domains)`;

    startQuizTimer(secondsForQuestionCount(state.questions.length));

    showView("quiz");
    renderQuestion();
  }

  function renderDomains() {
    const grid = $("#domain-grid");
    grid.innerHTML = "";
    CISSP_DOMAINS.forEach((d) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "domain-card";
      btn.setAttribute("aria-label", `Choose options for quiz: ${d.title}`);
      const n = poolForDomain(d.id).length;
      const wt =
        typeof d.examWeight === "number"
          ? `<span class="domain-stat">${n} Q · ~${d.examWeight}% exam</span>`
          : `<span class="domain-stat">${n} Q</span>`;
      btn.innerHTML = `
        <div class="num">Domain ${d.num}</div>
        <h2>${escapeHtml(d.title)}</h2>
        <p>${escapeHtml(d.blurb)}</p>
        <p class="domain-meta">${wt}</p>
      `;
      btn.addEventListener("click", () => openSetup(d.id));
      grid.appendChild(btn);
    });
  }

  function effectiveCount(preset, poolSize) {
    return Math.min(preset, poolSize);
  }

  function pillLabel(preset, poolSize) {
    const eff = effectiveCount(preset, poolSize);
    if (preset === 100 && eff < 100) {
      return `${eff} (all in bank)`;
    }
    if (eff < preset) {
      return `${eff} (max)`;
    }
    return String(eff);
  }

  function updateSetupPreview() {
    const poolSize = poolForDomain(state.domainId).length;
    const n = effectiveCount(state.selectedPreset, poolSize);
    const sec = secondsForQuestionCount(n);
    const secPerQ = Math.round((CISSP_CAT_MINUTES * 60) / CISSP_CAT_MAX_QUESTIONS);
    $("#setup-timer-preview").textContent = `Timer for this run: ${formatClock(sec)} (${n} questions × ~${secPerQ}s each, scaled from the 3 hr / 150-question CAT reference).`;
  }

  function openSetup(domainId) {
    state.domainId = domainId;
    const poolSize = poolForDomain(domainId).length;
    if (!poolSize) return;

    const domain = CISSP_DOMAINS.find((d) => d.id === domainId);
    $("#setup-domain-num").textContent = domain ? `Domain ${domain.num}` : "";
    $("#setup-heading").textContent = domain ? domain.title : "";
    const w = domain && typeof domain.examWeight === "number" ? domain.examWeight : null;
    const bankTotal =
      typeof CISSP_WEIGHTED_BANK_TOTAL === "number" ? CISSP_WEIGHTED_BANK_TOTAL : null;
    $("#setup-bank-size").textContent =
      w != null && bankTotal != null
        ? `This bank has ${poolSize} question${poolSize === 1 ? "" : "s"}. Official CISSP weight for this domain: ~${w}% of scored items (2024 blueprint). All domains together form a ${bankTotal}-question set split by those weights.`
        : `This bank has ${poolSize} question${poolSize === 1 ? "" : "s"}.`;

    const wrap = $("#setup-count-options");
    wrap.innerHTML = "";
    COUNT_PRESETS.forEach((preset) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "count-pill";
      btn.dataset.preset = String(preset);
      btn.textContent = pillLabel(preset, poolSize);
      if (preset === state.selectedPreset) btn.classList.add("selected");
      btn.addEventListener("click", () => {
        state.selectedPreset = preset;
        $$(".count-pill", wrap).forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        updateSetupPreview();
      });
      wrap.appendChild(btn);
    });

    if (!COUNT_PRESETS.includes(state.selectedPreset)) state.selectedPreset = 10;
    updateSetupPreview();
    showView("setup");
  }

  function startQuiz(domainId, preset) {
    const pool = poolForDomain(domainId);
    if (!pool.length) return;

    const n = effectiveCount(preset, pool.length);
    clearQuizTimer();
    state = {
      domainId,
      quizMode: "domain",
      questionDomains: null,
      answerRecord: [],
      questions: shuffle(pool).slice(0, n),
      index: 0,
      score: 0,
      shuffled: null,
      answered: false,
      timerId: null,
      timerEnd: null,
      timedOut: false,
      timeExpired: false,
      selectedPreset: preset,
    };
    state.shuffled = state.questions.map((q) => buildShuffle(q));

    const domain = CISSP_DOMAINS.find((d) => d.id === domainId);
    $("#quiz-domain-label").textContent = domain ? domain.title : "";

    const totalSec = secondsForQuestionCount(n);
    startQuizTimer(totalSec);

    showView("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    if (state.timeExpired) return;

    const i = state.index;
    const total = state.questions.length;
    const q = state.questions[i];
    const sh = state.shuffled[i];

    $("#progress-text").textContent = `Question ${i + 1} of ${total}`;
    const pct = ((i + 1) / total) * 100;
    $("#progress-fill").style.width = `${pct}%`;
    const bar = $("#progress-bar");
    bar.setAttribute("aria-valuenow", String(i + 1));
    bar.setAttribute("aria-valuemax", String(total));
    bar.setAttribute("aria-valuetext", `Question ${i + 1} of ${total}`);

    $("#question-text").textContent = q.q;
    $("#feedback-block").setAttribute("hidden", "");

    const wrap = $("#choices");
    wrap.innerHTML = "";
    sh.choices.forEach((text, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choice";
      b.textContent = text;
      b.addEventListener("click", () => selectChoice(idx));
      wrap.appendChild(b);
    });

    $("#btn-next").setAttribute("hidden", "");
    state.answered = false;
  }

  function selectChoice(choiceIndex) {
    if (state.timeExpired || state.answered) return;
    state.answered = true;

    const i = state.index;
    const q = state.questions[i];
    const sh = state.shuffled[i];
    const correct = sh.correct === choiceIndex;

    if (!state.answerRecord) state.answerRecord = [];
    state.answerRecord[i] = correct;

    if (correct) state.score += 1;

    const buttons = $$(".choice");
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === sh.correct) btn.classList.add("correct");
      else if (idx === choiceIndex && !correct) btn.classList.add("wrong");
    });

    $("#feedback-text").textContent = q.explain;
    $("#feedback-block").removeAttribute("hidden");
    $("#btn-next").removeAttribute("hidden");
  }

  function nextQuestion() {
    state.index += 1;
    if (state.index >= state.questions.length) {
      clearQuizTimer();
      state.timedOut = false;
      showResults();
      return;
    }
    renderQuestion();
  }

  function computeDomainBreakdown() {
    const byDomain = {};
    CISSP_DOMAINS.forEach((d) => {
      byDomain[d.id] = { total: 0, right: 0 };
    });
    for (let i = 0; i < state.questions.length; i++) {
      const did = state.questionDomains[i];
      if (!did) continue;
      byDomain[did].total++;
      if (state.answerRecord[i] === true) byDomain[did].right++;
    }
    return byDomain;
  }

  function renderResultsBreakdown() {
    const el = $("#results-domain-breakdown");
    if (state.domainId !== "full" || !state.questionDomains || !state.questionDomains.length) {
      el.setAttribute("hidden", "");
      el.innerHTML = "";
      return;
    }
    const bd = computeDomainBreakdown();
    el.innerHTML = "";
    const h3 = document.createElement("h3");
    h3.className = "results-breakdown-title";
    h3.textContent = "Score by domain";
    el.appendChild(h3);
    const dl = document.createElement("dl");
    dl.className = "domain-breakdown";
    CISSP_DOMAINS.forEach((d) => {
      const row = bd[d.id];
      if (!row || row.total === 0) return;
      const dt = document.createElement("dt");
      dt.textContent = `Domain ${d.num}: ${d.title}`;
      const dd = document.createElement("dd");
      dd.textContent = `${row.right} / ${row.total}`;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    el.appendChild(dl);
    el.removeAttribute("hidden");
  }

  function showResults() {
    clearQuizTimer();

    const total = state.questions.length;
    const isFull = state.domainId === "full";

    $("#results-heading").textContent = isFull ? "Full exam complete" : "Quiz complete";

    if (isFull) {
      $("#results-domain").textContent =
        "CAT-length sample — random questions from all domains, shuffled.";
    } else {
      const domain = CISSP_DOMAINS.find((d) => d.id === state.domainId);
      $("#results-domain").textContent = domain ? domain.title : "";
    }

    $("#results-score").textContent = `${state.score} / ${total}`;
    const pct = total ? Math.round((state.score / total) * 100) : 0;
    $("#results-pct").textContent = `${pct}% correct`;

    renderResultsBreakdown();

    const note = $("#results-note");
    if (state.timedOut) {
      note.textContent =
        "Time’s up — questions you did not reach or finish count against your score.";
      note.removeAttribute("hidden");
    } else {
      note.setAttribute("hidden", "");
    }

    $("#btn-retake").textContent = isFull ? "Full exam setup" : "Retake this domain";

    showView("results");
  }

  $("#btn-next").addEventListener("click", nextQuestion);

  function goLanding() {
    clearQuizTimer();
    state.timeExpired = false;
    state.timedOut = false;
    showView("landing");
  }

  $("#btn-back-domains").addEventListener("click", goLanding);
  $("#btn-back-domains-2").addEventListener("click", goLanding);

  $("#btn-setup-back").addEventListener("click", goLanding);

  $("#btn-open-full-setup").addEventListener("click", openFullSetup);
  $("#btn-full-setup-back").addEventListener("click", goLanding);
  $("#btn-full-start").addEventListener("click", startFullExam);

  $("#btn-setup-start").addEventListener("click", () => {
    if (!state.domainId) return;
    startQuiz(state.domainId, state.selectedPreset);
  });

  $("#btn-retake").addEventListener("click", () => {
    if (state.domainId === "full") openFullSetup();
    else if (state.domainId) openSetup(state.domainId);
  });

  renderDomains();
  showView("landing");
})();
