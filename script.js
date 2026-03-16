/**
 * script.js — Poetry Evaluation Study (Firebase edition)
 *
 * Handles all study flow, state, and Firebase data writes.
 * Reads FIREBASE_CONFIG and ADMIN_EMAIL from firebase-config.js
 * Reads POEMS, COMPARISON_POOL, and assignComparisons from poems.js
 */

/* ============================================================
   FIREBASE INITIALISATION
   ============================================================ */
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();

/* ============================================================
   STATE
   ============================================================ */
const state = {
  sessionId:              generateSessionId(),
  currentPage:            "welcome",
  comparisons:            [],   // assigned subset from pool (9 comparisons)
  currentComparisonIndex: 0,
  responses:              [],   // per-comparison records
  familiarity:            null,
  swapFlags:              [],   // per-comparison random A/B swap flag
  currentAnswers:         {},   // answers for current comparison (q1–q4)
};

/* ============================================================
   UTILITIES
   ============================================================ */

function generateSessionId() {
  return "sess_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now();
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add("active");
    target.style.animation = "none";
    void target.offsetHeight;
    target.style.animation = "";
  }
  state.currentPage = pageId;
  updateProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgress() {
  const fill  = document.getElementById("progress-fill");
  const label = document.getElementById("progress-label");
  if (!fill) return;

  const total = state.comparisons.length;
  const idx   = state.currentComparisonIndex;

  const stagePct = {
    welcome:      0,
    consent:      5,
    instructions: 12,
    comparison:   total > 0 ? 12 + ((idx / total) * 75) : 12,
    final:        90,
    thankyou:     100,
    declined:     100,
  };

  fill.style.width = (stagePct[state.currentPage] ?? 0) + "%";
  if (label) label.textContent = state.currentPage === "comparison"
    ? `${idx + 1} / ${total}` : "";
}

/* ── Toast notifications ── */
let toastTimer = null;
function showToast(message, type = "info", duration = 3500) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.className = `toast toast-${type} visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), duration);
}

/* ============================================================
   NAVIGATION
   ============================================================ */

function startStudy() {
  showPage("consent");
}

function submitConsent() {
  const selected = document.querySelector('input[name="consent"]:checked');
  const msg = document.getElementById("consent-validation");
  if (!selected) { msg.classList.add("visible"); return; }
  msg.classList.remove("visible");
  selected.value === "yes" ? showPage("instructions") : showPage("declined");
}

function startComparisons() {
  // Assign 9 random comparisons balanced across themes
  state.comparisons = assignComparisons(9);
  state.swapFlags   = state.comparisons.map(() => Math.random() < 0.5);
  state.currentComparisonIndex = 0;
  renderComparison();
  showPage("comparison");
}

function nextComparison() {
  // Validate all 4 questions answered
  const questions = ["q1", "q2", "q3", "q4"];
  const allAnswered = questions.every(q => state.currentAnswers[q] !== undefined);
  const msg = document.getElementById("comparison-validation");

  if (!allAnswered) {
    msg.classList.add("visible");
    return;
  }
  msg.classList.remove("visible");

  recordResponse();
  state.currentComparisonIndex++;

  if (state.currentComparisonIndex < state.comparisons.length) {
    renderComparison();
    showPage("comparison");
  } else {
    showPage("final");
  }
}

function submitFinal() {
  const sel = document.querySelector('input[name="familiarity"]:checked');
  state.familiarity = sel ? sel.value : null;
  showPage("thankyou");
  saveToFirebase();
}

/* ============================================================
   COMPARISON RENDERING
   ============================================================ */

function renderComparison() {
  const comp    = state.comparisons[state.currentComparisonIndex];
  const swapped = state.swapFlags[state.currentComparisonIndex];

  // Reset current answers
  state.currentAnswers = {};

  // Look up poem objects
  const poemA = POEMS[comp.poemA_id];
  const poemB = POEMS[comp.poemB_id];

  document.getElementById("comparison-theme").textContent = comp.theme;
  document.getElementById("comparison-counter").textContent =
    `Comparison ${state.currentComparisonIndex + 1} of ${state.comparisons.length}`;

  // Swap display order randomly
  document.getElementById("poem-left").textContent  = swapped ? poemB.text : poemA.text;
  document.getElementById("poem-right").textContent = swapped ? poemA.text : poemB.text;

  // Reset all button selections
  document.querySelectorAll("#comparison .choice-btn").forEach(btn => btn.classList.remove("selected"));

  // Hide validation
  const msg = document.getElementById("comparison-validation");
  if (msg) msg.classList.remove("visible");
}

function selectAnswer(questionId, btn) {
  // Deselect siblings in same question group
  const group = btn.closest('.choice-options');
  group.querySelectorAll(".choice-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");

  // Store answer
  state.currentAnswers[questionId] = btn.dataset.value;
}

/* ============================================================
   DATA COLLECTION
   ============================================================ */

function recordResponse() {
  const comp    = state.comparisons[state.currentComparisonIndex];
  const swapped = state.swapFlags[state.currentComparisonIndex];

  const poemA = POEMS[comp.poemA_id];
  const poemB = POEMS[comp.poemB_id];

  // Map visual answers (A/B) back to canonical IDs based on swap
  function mapAnswer(answer) {
    if (answer === "A") return swapped ? "B" : "A";
    if (answer === "B") return swapped ? "A" : "B";
    return answer; // Tie, Both equally, Not sure, Neither
  }

  state.responses.push({
    comparisonId:            comp.id,
    theme:                   comp.theme,
    poemA_id:                comp.poemA_id,
    poemB_id:                comp.poemB_id,
    original_condition_A:    poemA.condition,
    original_condition_B:    poemB.condition,
    displayed_left_poem_id:  swapped ? comp.poemB_id : comp.poemA_id,
    displayed_right_poem_id: swapped ? comp.poemA_id : comp.poemB_id,
    displayed_left_condition:  swapped ? poemB.condition : poemA.condition,
    displayed_right_condition: swapped ? poemA.condition : poemB.condition,
    stronger_overall_answer:   mapAnswer(state.currentAnswers.q1),
    emotional_impact_answer:   mapAnswer(state.currentAnswers.q2),
    originality_answer:        mapAnswer(state.currentAnswers.q3),
    like_answer:               mapAnswer(state.currentAnswers.q4),
    timestamp:                 new Date().toISOString(),
  });
}

/* ============================================================
   FIREBASE WRITE
   ============================================================ */

async function saveToFirebase() {
  const statusEl = document.getElementById("thankyou-status");

  const payload = {
    sessionId:   state.sessionId,
    familiarity: state.familiarity,
    completedAt: new Date().toISOString(),
    responses:   state.responses,
  };

  // Always log to console as a backup
  console.log("[Poetry Study] Payload:", JSON.stringify(payload, null, 2));

  try {
    await db.ref("sessions/" + state.sessionId).set(payload);

    if (statusEl) {
      statusEl.innerHTML = "✓ Your responses have been saved. Thank you.";
    }
    showToast("Responses saved successfully.", "success");
    console.log("[Poetry Study] Saved to Firebase at sessions/" + state.sessionId);

  } catch (err) {
    console.error("[Poetry Study] Firebase write failed:", err);
    if (statusEl) {
      statusEl.innerHTML =
        "Your responses could not be saved automatically. " +
        "Please screenshot or copy the data below and send to the researcher.";
    }
    // Show raw JSON as fallback so data is never lost
    const fallback = document.createElement("pre");
    fallback.style.cssText =
      "background:var(--cream-dark);border:1px solid var(--rule);border-radius:3px;" +
      "padding:1rem;font-size:0.75rem;font-family:monospace;margin-top:1rem;" +
      "white-space:pre-wrap;overflow-x:auto;max-height:200px;overflow-y:auto;";
    fallback.textContent = JSON.stringify(payload, null, 2);
    statusEl?.parentNode?.insertBefore(fallback, statusEl.nextSibling);
    showToast("Save failed — please copy the data below.", "error", 6000);
  }
}
