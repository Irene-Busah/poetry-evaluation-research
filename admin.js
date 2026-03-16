/**
 * admin.js — Poetry Study Admin Dashboard
 * Handles Google Sign-In, auth guard, live Firebase data, and CSV export.
 * Updated for 4-question response format with condition tracking.
 */

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();
const auth = firebase.auth();

/* ── Auth ── */
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => showLoginError(err.message));
}

function signOut() { auth.signOut(); }

auth.onAuthStateChanged(user => {
  if (!user) {
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("admin-layout").classList.remove("visible");
    return;
  }
  if (user.email !== ADMIN_EMAIL) {
    auth.signOut();
    showLoginError(`Access denied. This dashboard is restricted to ${ADMIN_EMAIL}. You signed in as ${user.email}.`);
    return;
  }
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-layout").classList.add("visible");
  document.getElementById("admin-user-email").textContent = user.email;
  loadData();
});

function showLoginError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.style.display = "block";
}

/* ── Data ── */
let _listener = null;

function loadData() {
  document.getElementById("admin-loading").style.display = "flex";
  document.getElementById("admin-content").style.display = "none";

  const ref = db.ref("sessions");
  if (_listener) ref.off("value", _listener);

  _listener = ref.on("value", snap => {
    const raw = snap.val();
    const sessions = raw ? Object.values(raw) : [];
    render(sessions);
    document.getElementById("admin-loading").style.display = "none";
    document.getElementById("admin-content").style.display = "block";
  }, err => {
    document.getElementById("admin-loading").innerHTML =
      `<span style="color:#c06060;font-family:var(--font-mono);font-size:0.8rem">Error: ${err.message}</span>`;
  });
}

/* ── Render ── */
function render(sessions) {
  const all = [];
  sessions.forEach(s => {
    (s.responses || []).forEach(r => {
      all.push({
        sessionId: s.sessionId || "—",
        familiarity: s.familiarity || null,
        theme: r.theme,
        poemA_id: r.poemA_id,
        poemB_id: r.poemB_id,
        original_condition_A: r.original_condition_A || "—",
        original_condition_B: r.original_condition_B || "—",
        stronger: r.stronger_overall_answer || r.participantChoice || "—",
        emotional: r.emotional_impact_answer || "—",
        originality: r.originality_answer || "—",
        like: r.like_answer || "—",
        timestamp: r.timestamp || s.completedAt || null,
      });
    });
  });

  // Stats
  document.getElementById("stat-sessions").textContent = sessions.length;
  document.getElementById("stat-responses").textContent = all.length;
  const themes = [...new Set(all.map(r => r.theme))];
  document.getElementById("stat-themes").textContent = themes.length;
  const latest = sessions.map(s => s.completedAt).filter(Boolean).sort().reverse()[0];
  document.getElementById("stat-latest").textContent = latest ? formatDate(latest) : "—";

  renderThemes(all, themes);
  renderFamiliarity(sessions);
  renderTable(all);
}

function renderThemes(all, themes) {
  const grid = document.getElementById("theme-grid");
  document.getElementById("theme-meta").textContent =
    themes.length ? `${themes.length} theme${themes.length !== 1 ? "s" : ""}` : "";

  if (!themes.length) { grid.innerHTML = '<div class="empty">No data yet.</div>'; return; }

  grid.innerHTML = themes.map(theme => {
    const rows = all.filter(r => r.theme === theme);
    const total = rows.length;
    const a = rows.filter(r => r.stronger === "A").length;
    const b = rows.filter(r => r.stronger === "B").length;
    const tie = rows.filter(r => r.stronger === "Tie").length;
    const pct = n => total > 0 ? Math.round((n / total) * 100) : 0;

    return `<div class="theme-card">
      <div class="theme-name">${esc(theme)}</div>
      <div class="theme-total">${total} response${total !== 1 ? "s" : ""}</div>
      <div class="bar-row">
        <span class="bar-label">Poem A</span>
        <div class="bar-track"><div class="bar-fill bar-fill-a" style="width:${pct(a)}%"></div></div>
        <span class="bar-pct">${pct(a)}%</span>
      </div>
      <div class="bar-row">
        <span class="bar-label">Poem B</span>
        <div class="bar-track"><div class="bar-fill bar-fill-b" style="width:${pct(b)}%"></div></div>
        <span class="bar-pct">${pct(b)}%</span>
      </div>
      <div class="bar-row">
        <span class="bar-label">Tie</span>
        <div class="bar-track"><div class="bar-fill bar-fill-tie" style="width:${pct(tie)}%"></div></div>
        <span class="bar-pct">${pct(tie)}%</span>
      </div>
    </div>`;
  }).join("");
}

function renderFamiliarity(sessions) {
  const grid = document.getElementById("fam-grid");
  const labels = {
    very_familiar: "Very familiar",
    somewhat_familiar: "Somewhat familiar",
    not_very_familiar: "Not very familiar",
    not_familiar: "Not familiar at all",
  };
  const total = sessions.length;
  if (!total) { grid.innerHTML = '<div class="empty">No data yet.</div>'; return; }

  const counts = {};
  Object.keys(labels).forEach(k => counts[k] = 0);
  sessions.forEach(s => { if (counts[s.familiarity] !== undefined) counts[s.familiarity]++; });

  grid.innerHTML = Object.entries(labels).map(([key, label]) => {
    const n = counts[key] || 0;
    const pct = total > 0 ? Math.round((n / total) * 100) : 0;
    return `<div class="fam-card">
      <div class="fam-pct">${pct}%</div>
      <div class="fam-label">${label}</div>
      <div class="fam-count">${n} of ${total}</div>
    </div>`;
  }).join("");
}

function renderTable(all) {
  const tbody = document.getElementById("responses-tbody");
  if (!all.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">No responses yet.</td></tr>';
    return;
  }
  const sorted = [...all].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  tbody.innerHTML = sorted.map(r => {
    const badgeCls = v => v === "A" ? "badge-a" : v === "B" ? "badge-b" : "badge-tie";
    return `<tr>
      <td class="mono">${esc(shortId(r.sessionId))}</td>
      <td>${esc(r.theme)}</td>
      <td class="mono" style="font-size:0.7rem">${esc(shortCond(r.original_condition_A))}</td>
      <td class="mono" style="font-size:0.7rem">${esc(shortCond(r.original_condition_B))}</td>
      <td><span class="badge ${badgeCls(r.stronger)}">${esc(r.stronger)}</span></td>
      <td><span class="badge ${badgeCls(r.emotional)}">${esc(r.emotional)}</span></td>
      <td><span class="badge ${badgeCls(r.originality)}">${esc(r.originality)}</span></td>
      <td><span class="badge ${badgeCls(r.like)}">${esc(r.like)}</span></td>
      <td class="mono" style="font-size:0.7rem">${esc(formatDate(r.timestamp))}</td>
    </tr>`;
  }).join("");
}

/* ── CSV Export ── */
function exportCSV() {
  db.ref("sessions").once("value").then(snap => {
    const raw = snap.val();
    const sessions = raw ? Object.values(raw) : [];
    if (!sessions.length) { showToast("No data to export.", "info"); return; }

    const headers = [
      "sessionId", "completedAt", "familiarity",
      "comparisonId", "comparison_type", "theme",
      "poemA_id", "poemB_id",
      "original_condition_A", "original_condition_B",
      "displayed_left_poem_id", "displayed_right_poem_id",
      "displayed_left_condition", "displayed_right_condition",
      "stronger_overall_answer", "stronger_overall_selected_poem_id", "stronger_overall_selected_condition",
      "emotional_impact_answer", "emotional_impact_selected_poem_id", "emotional_impact_selected_condition",
      "originality_answer", "originality_selected_poem_id", "originality_selected_condition",
      "like_answer", "like_selected_poem_id", "like_selected_condition",
      "timestamp"
    ];

    const lines = [headers.join(",")];
    sessions.forEach(s => {
      (s.responses || []).forEach(r => {
        lines.push([
          csv(s.sessionId), csv(s.completedAt || ""),
          csv(s.familiarity || ""),
          csv(r.comparisonId || ""), csv(r.comparison_type || ""), csv(r.theme),
          csv(r.poemA_id), csv(r.poemB_id),
          csv(r.original_condition_A || ""), csv(r.original_condition_B || ""),
          csv(r.displayed_left_poem_id || ""), csv(r.displayed_right_poem_id || ""),
          csv(r.displayed_left_condition || ""), csv(r.displayed_right_condition || ""),

          csv(r.stronger_overall_answer || r.participantChoice || ""),
          csv(r.stronger_overall_selected_poem_id || ""),
          csv(r.stronger_overall_selected_condition || ""),

          csv(r.emotional_impact_answer || ""),
          csv(r.emotional_impact_selected_poem_id || ""),
          csv(r.emotional_impact_selected_condition || ""),

          csv(r.originality_answer || ""),
          csv(r.originality_selected_poem_id || ""),
          csv(r.originality_selected_condition || ""),

          csv(r.like_answer || ""),
          csv(r.like_selected_poem_id || ""),
          csv(r.like_selected_condition || ""),

          csv(r.timestamp || s.completedAt || ""),
        ].join(","));
      });
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `poetry_study_${stamp()}.csv` });
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded.", "success");
  }).catch(err => showToast("Export failed: " + err.message, "error"));
}

/* ── Helpers ── */
function esc(s) {
  if (!s) return "—";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function csv(v) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}
function shortId(id) { return id ? id.replace("sess_", "").slice(0, 10) : "—"; }
function shortCond(c) {
  return { "Baseline": "BASE", "Guideline": "GUIDE", "Persona": "PERS" }[c] || c || "—";
}
function formatDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
function famLabel(v) {
  return {
    very_familiar: "Very familiar", somewhat_familiar: "Somewhat familiar",
    not_very_familiar: "Not very familiar", not_familiar: "Not familiar at all"
  }[v] || (v || "—");
}
function stamp() { return new Date().toISOString().slice(0, 10); }

let _toastTimer = null;
function showToast(msg, type = "info", dur = 3500) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast toast-${type} visible`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("visible"), dur);
}