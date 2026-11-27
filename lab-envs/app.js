(() => {
"use strict";
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (v) => {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") { if (Number.isInteger(v)) return v.toLocaleString("en-US"); const a = Math.abs(v); return a >= 1000 ? v.toFixed(0) : a >= 100 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : a === 0 ? "0" : v.toPrecision(2); }
  if (typeof v === "object") return Object.entries(v).map(([k, x]) => `${k} ${fmt(x)}`).join(", ");
  return String(v);
};
const pct = x => (x == null ? "–" : Math.round(x * 100) + "%");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const RUN_IDS = { wet: ["wet-1", "wet-2", "wet-3", "wet-4", "wet-5", "wet-6"], drywet: ["drywet-1", "drywet-2", "drywet-3"], project: ["project-1"] };
const RUNS = {}; const IDX = {};

async function getJSON(p) { try { const r = await fetch(p); if (!r.ok) return null; return await r.json(); } catch { return null; } }

async function load() {
  const all = [...RUN_IDS.wet, ...RUN_IDS.drywet, ...RUN_IDS.project];
  const [runs, wi, di, pi] = await Promise.all([
    Promise.all(all.map(id => getJSON(`data/${id}.json`))),
    getJSON("data/wet-index.json"), getJSON("data/drywet-index.json"), getJSON("data/project-index.json"),
  ]);
  runs.forEach((r, i) => { if (r) { prep(r); RUNS[all[i]] = r; } });
  IDX.wet = wi; IDX.drywet = di; IDX.project = pi;
}

// values the agent itself sets or can read off its own notebook: shown, but never counted as hidden
const KNOWN = new Set(["vessel", "furnace_set_c", "budget_used", "sample", "segment", "film", "film_substrate", "film_strain_pct", "sealed"]);
const isFailed = r => r && r.outcome && !r.outcome.pass;
const FRAME_BASE = "frames/";
// frames come from files, or (in the hosted copy) from packed JSON files listed in window.FRAME_PACKS
const PACKS = window.FRAME_PACKS || null, packCache = {};
function frameURL(name) {
  if (!PACKS) return Promise.resolve(FRAME_BASE + name);
  const f = PACKS[name]; if (!f) return Promise.resolve("");
  if (!packCache[f]) packCache[f] = fetch(f).then(r => r.json()).catch(() => ({}));
  return packCache[f].then(d => d[name] || "");
}
function setImg(img, name) {
  if (img.dataset.want === name) return; img.dataset.want = name;
  frameURL(name).then(u => { if (img.dataset.want === name && u) img.src = u; });
}
function prefetch(name) { if (PACKS) frameURL(name); else { const p = new Image(); p.src = FRAME_BASE + name; } }
function prep(r) {
  r.steps = r.steps || [];
  r.vars = (r.vars || []).filter(v => r.steps.some(s => s.hidden && s.hidden[v.key] !== undefined));
  r.vars.forEach(v => { v.known = KNOWN.has(v.key); });
  r.hvars = r.vars.filter(v => !v.known);
  r.steps.forEach((s, k) => { s.k = k; s.hidden = s.hidden || {}; s.events = s.events || []; });
  // carry hidden values forward so every step has a full state
  let last = {};
  r.steps.forEach(s => { last = { ...last, ...s.hidden }; s.full = last; });
  r.failStep = r.failure && r.failure.step != null ? r.steps.findIndex(s => s.i === r.failure.step) : -1;
}
const scoreCls = r => r.outcome && r.outcome.pass ? "pass" : (r.outcome && r.outcome.score > 0 ? "part" : "fail");
const scoreTxt = r => r.outcome ? (r.outcome.pass ? "Pass" : "Fail") + " · " + Number(r.outcome.score).toFixed(2) : "–";
const numVars = r => r.hvars.filter(v => v.kind === "number" || (v.kind == null && r.steps.some(s => typeof s.full[v.key] === "number")));

/* ---------- sparkline for a numeric var up to step k ---------- */
function spark(r, v, k, w = 300, h = 30, color = "#E9EAEE") {
  const xs = r.steps.map(s => s.full[v.key]).map(x => typeof x === "number" ? x : null);
  const vals = xs.filter(x => x !== null); if (!vals.length) return "";
  let lo = Math.min(...vals), hi = Math.max(...vals); if (hi === lo) { hi += 1; lo -= 1; }
  const n = r.steps.length, X = i => (n < 2 ? 0 : i / (n - 1)) * w, Y = x => h - 3 - (x - lo) / (hi - lo) * (h - 6);
  let d = "", dd = ""; xs.forEach((x, i) => { if (x === null) return; const seg = `${d || dd ? "L" : "M"}${X(i).toFixed(1)},${Y(x).toFixed(1)}`; if (i <= k) d += seg; dd += seg; });
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${dd}" fill="none" stroke="${color}" stroke-opacity=".18" stroke-width="1.5"/><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6"/><circle cx="${X(k)}" cy="${xs[k] == null ? -9 : Y(xs[k])}" r="2.6" fill="${color}"/></svg>`;
}

/* ---------- hero theatre ---------- */
const hero = { env: "wet", run: null, k: 0, playing: !REDUCED, timer: null };
function heroPick(env) {
  const ids = RUN_IDS[env].filter(id => RUNS[id]);
  // prefer a failed run: it shows the gap between what was seen and what was true
  const fails = ids.filter(id => isFailed(RUNS[id]));
  hero.env = env; hero.run = RUNS[fails[0] || ids[0]] || null;
  const f0 = hero.run ? hero.run.steps.findIndex(s => s.flag && s.flag !== "good") : -1;
  hero.k = hero.start = Math.max(0, f0 - 10);
  document.querySelectorAll(".seg button").forEach(b => b.setAttribute("aria-selected", b.dataset.env === env));
  heroDraw(true);
}
function heroDraw(reset) {
  const r = hero.run; if (!r) { $("#heroRun").textContent = "Loading recorded runs…"; return; }
  const k = hero.k, s = r.steps[k];
  $("#heroRun").innerHTML = `<b>${esc(r.title)}</b> · ${esc(r.model)} · ${esc(scoreTxt(r))}`;
  const feed = $("#heroFeed");
  if (reset) feed.innerHTML = "";
  const fr = r.steps.slice(0, k + 1).reverse().find(x => x.frame);
  if (fr) {
    feed.classList.add("has-frame"); feed.classList.toggle("plot", /\.svg$/.test(fr.frame));
    feed.innerHTML = `<li class="frame"><img data-f="${esc(fr.frame)}" alt="Agent's screen at step ${fr.i}"></li><li class="${s.flag ? "f-" + s.flag : ""}"><b>${String(s.i).padStart(3, "0")} ${esc(s.tool)}</b> ${esc((s.args || "").slice(0, 60))}<span class="o">${esc((s.obs || "").replace(/\s+/g, " ").slice(0, 120))}</span></li>`;
    const hi = feed.querySelector("img[data-f]"); if (hi) setImg(hi, hi.dataset.f);
  } else feed.classList.remove("has-frame");
  const from = Math.max(0, k - 7);
  if (!fr) feed.innerHTML = r.steps.slice(from, k + 1).map(x => `<li class="${x.flag ? "f-" + x.flag : ""}"><b>${String(x.i).padStart(3, "0")} ${esc(x.tool)}</b> ${esc((x.args || "").slice(0, 60))}<span class="o">${esc((x.obs || "").replace(/\s+/g, " ").slice(0, 120))}</span></li>`).join("");
  const PREF = ["oxide_pct", "furnace_true_c", "x_lattice", "tn_true_k", "dopant_metal_pct", "x_true", "gap_true", "u_true", "film_strain_pct", "dft_gap_err", "tn_offset_k", "zero_deg"];
  const nv = [...PREF.map(k => r.vars.find(v => v.key === k)).filter(Boolean), ...numVars(r)].filter((v, i, a) => a.indexOf(v) === i && numVars(r).includes(v)).slice(0, 4);
  const ev = s.events.length ? s.events[0] : (r.steps.slice(0, k + 1).reverse().find(x => x.events.length) || {}).events?.[0];
  const red = s.flag === "fault" || s.flag === "miss" || k === r.failStep;
  $("#heroTruth").innerHTML = nv.map(v => {
    const cur = s.full[v.key], prev = k > 0 ? r.steps[k - 1].full[v.key] : cur;
    return `<div class="tv ${cur !== prev ? "hot" : ""}"><span class="k">${esc(v.label)}</span><span class="v">${esc(fmt(cur))}${v.unit ? " " + esc(v.unit) : ""}</span>${spark(r, v, k)}</div>`;
  }).join("") + `<div class="ev ${red ? "red" : ""}">${ev ? esc(ev) : ""}</div>`;
  $("#heroTime").innerHTML = timeline(r, k, { h: 30, compact: true });
  $("#heroOpen").onclick = () => { openRun(r.id, k); };
}
function heroTick() {
  const r = hero.run; if (!r || !hero.playing) return;
  hero.k = hero.k + 1 >= r.steps.length ? hero.start || 0 : hero.k + 1;
  heroDraw(hero.k === (hero.start || 0));
}
function heroLoop() { clearInterval(hero.timer); hero.timer = setInterval(heroTick, 900); }

/* ---------- timeline (stage bands, call ticks, var lanes) ---------- */
function timeline(r, k, o = {}) {
  const W = 1000, n = r.steps.length, X = i => (n < 2 ? 0 : i / (n - 1)) * W;
  if (o.compact) {
    const ticks = r.steps.map((s, i) => s.flag ? `<rect x="${X(i) - 1}" y="${s.flag === "drift" ? 8 : 4}" width="2.4" height="${s.flag === "drift" ? 14 : 22}" fill="${s.flag === "drift" ? "#F2A93B" : s.flag === "good" ? "#3FB37F" : "#E5484D"}"/>` : "").join("");
    return `<svg viewBox="0 0 ${W} 30" preserveAspectRatio="none" style="width:100%;height:30px" aria-hidden="true"><rect y="14" width="${W}" height="2" fill="#272C37"/><rect y="14" width="${X(k)}" height="2" fill="#E9EAEE"/>${ticks}<rect x="${X(k) - 1}" y="0" width="2" height="30" fill="#fff"/></svg>`;
  }
  const lanes = numVars(r).slice(0, 6), LH = 26, top = 34, H = top + 22 + lanes.length * LH + 8;
  let g = "";
  const bands = (r.stages || []).every((st, j, a) => j === 0 || st.from > a[j - 1].to) ? r.stages || [] : [];
  bands.forEach((st, j) => {
    const a = r.steps.findIndex(s => s.i >= st.from), b = r.steps.findIndex(s => s.i > st.to);
    const x0 = X(Math.max(0, a)), x1 = b < 0 ? W : X(b);
    g += `<rect x="${x0}" y="0" width="${Math.max(1, x1 - x0)}" height="18" fill="${j % 2 ? "#1C2029" : "#232835"}"/><text x="${x0 + 6}" y="13" fill="#A3A8B3" font-size="11" font-family="Geist, sans-serif">${esc(st.label)}</text>`;
  });
  r.steps.forEach((s, i) => {
    const c = s.flag === "drift" ? "#F2A93B" : (s.flag === "fault" || s.flag === "miss") ? "#E5484D" : s.flag === "good" ? "#3FB37F" : "#5B6272";
    g += `<rect x="${X(i) - .6}" y="${top - 10 + (s.flag ? 0 : 4)}" width="1.4" height="${s.flag ? 18 : 10}" fill="${c}"/>`;
  });
  lanes.forEach((v, j) => {
    const y0 = top + 22 + j * LH, xs = r.steps.map(s => typeof s.full[v.key] === "number" ? s.full[v.key] : null), vals = xs.filter(x => x !== null);
    let lo = Math.min(...vals), hi = Math.max(...vals); if (hi === lo) { hi += 1; lo -= 1; }
    let d = ""; xs.forEach((x, i) => { if (x === null) return; d += `${d ? "L" : "M"}${X(i).toFixed(1)},${(y0 + LH - 6 - (x - lo) / (hi - lo) * (LH - 10)).toFixed(1)}`; });
    g += `<text x="0" y="${y0 + 9}" fill="#8B919D" font-size="10.5" font-family="Geist, sans-serif">${esc(v.label)}</text><path d="${d}" fill="none" stroke="#E9EAEE" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`;
  });
  if (r.failStep >= 0) g += `<rect x="${X(r.failStep) - 1}" y="0" width="2" height="${H}" fill="#E5484D" opacity=".8"/>`;
  g += `<rect x="${X(k) - 1}" y="0" width="2" height="${H}" fill="#3D5AFE"/><rect x="${X(k) - 5}" y="${top - 14}" width="10" height="4" rx="2" fill="#3D5AFE"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" role="slider" tabindex="0" aria-label="Step timeline" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${k + 1}">${g}</svg>`;
}

/* ---------- claims (the case) ---------- */
function findStep(r, pred) { if (!r) return null; return r.steps.find(pred) || null; }
/* mini replay: an auto-playing window of a real run around the evidence step */
const MINI = [];
function pairProof(r, s, label, o = {}) {
  if (!r || !s) return `<div class="proof"><div class="loading">Run data could not be loaded.</div></div>`;
  const n = r.steps.length, a = Math.max(0, s.k - (o.before ?? 12)), b = Math.min(n - 1, s.k + (o.after ?? 4));
  const id = MINI.length;
  MINI.push({ r, a, b, focus: s.k, k: a, hold: 0, vars: o.vars || [], label: label || r.title, gui: r.steps.slice(a, b + 1).some(x => x.frame && /\.webp$/.test(x.frame)) });
  return `<div class="proof mini" data-mini="${id}"><div class="proof-h"><span>${esc(label || r.title)} · replay of steps ${r.steps[a].i}–${r.steps[b].i}</span><a href="#runs" data-open="${esc(r.id)}" data-step="${s.k}">Open in explorer</a></div><div class="mini-body"></div></div>`;
}
function miniDraw(m, el) {
  const r = m.r, s = r.steps[m.k], prev = m.k > 0 ? r.steps[m.k - 1].full : {};
  const fr = r.steps.slice(m.a, m.k + 1).reverse().find(x => x.frame);
  const isFocus = m.k === m.focus;
  const evs = s.events.length ? s.events : [];
  const vars = (m.vars.length ? m.vars.map(k => r.vars.find(v => v.key === k)).filter(Boolean) : numVars(r).slice(0, 2));
  const pos = (m.k - m.a) / Math.max(1, m.b - m.a) * 100, fpos = (m.focus - m.a) / Math.max(1, m.b - m.a) * 100;
  const body = el.querySelector(".mini-body");
  if (!body.firstChild) body.innerHTML = `<div class="mini-shot" hidden><img alt=""></div><div class="pair"><div class="m-saw"><div class="t">What the agent did and saw</div><div class="c m-call"></div></div><div class="m-true"><div class="t">What was true</div><div class="c m-tv"></div></div></div><div class="m-bar"><i class="m-f"></i><i class="m-p"></i></div>`;
  const shot = body.querySelector(".mini-shot"), img = shot.querySelector("img");
  if (fr) { shot.hidden = false; if (img.dataset.want !== fr.frame) { setImg(img, fr.frame); img.alt = /\.svg$/.test(fr.frame) ? `Instrument data at step ${fr.i}` : `Agent's screen at step ${fr.i}`; } } else shot.hidden = true;
  const said = r.steps.slice(Math.max(m.a, m.k - 8), m.k + 1).reverse().find(x => x.say);
  body.querySelector(".m-call").innerHTML = `<span class="m-step ${isFocus ? "on" : ""}">step ${s.i}</span> <b>${esc(s.tool)}</b> ${esc((s.args || "").slice(0, 80))}<br><span class="m-obs">${esc((s.obs || "").replace(/\s+/g, " ").slice(0, 150))}</span>${said ? `<span class="m-say">“${esc(said.say.replace(/\s+/g, " ").slice(0, 160))}${said.say.length > 160 ? "…" : ""}”</span>` : ""}`;
  body.querySelector(".m-tv").innerHTML = (evs.length ? `<div class="m-ev ${s.flag === "fault" || s.flag === "miss" ? "red" : ""}">${evs.slice(0, 2).map(esc).join("<br>")}</div>` : `<div class="m-ev quiet">No hidden change at this step</div>`) +
    vars.map(v => { const cur = s.full[v.key], ch = JSON.stringify(cur) !== JSON.stringify(prev[v.key]); return `<div class="m-v ${ch ? "chg" : ""}"><span>${esc(v.label)}</span><b>${esc(fmt(cur))}${v.unit && cur != null ? " " + esc(v.unit) : ""}</b></div>`; }).join("");
  el.classList.toggle("focus", isFocus);
  body.querySelector(".m-p").style.left = pos + "%"; body.querySelector(".m-f").style.left = fpos + "%";
}
function miniStart() {
  const els = [...document.querySelectorAll("[data-mini]")];
  const vis = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)), { threshold: 0.35 });
  els.forEach(el => { const m = MINI[+el.dataset.mini]; m.k = m.focus; m.hold = 0; miniDraw(m, el); io.observe(el); });
  if (REDUCED) return;
  setInterval(() => vis.forEach(el => {
    const m = MINI[+el.dataset.mini];
    if (m.k === m.focus && m.hold < 7) { m.hold++; return; }   // linger on the evidence step
    if (m.k >= m.b) { if (m.hold < 7) { m.hold++; return; } m.k = m.a; m.hold = 0; }
    else { m.k++; if (m.k !== m.focus) m.hold = 0; }
    miniDraw(m, el);
  }), 650);
}
function claimHTML(c) { return `<div class="claim"><div><h3>${c.h}</h3><p>${c.p}</p>${c.buy ? `<p class="why-buy"><strong>Why it matters for training:</strong> ${c.buy}</p>` : ""}</div>${c.proof}</div>`; }

function buildClaims() {
  const wet = RUN_IDS.wet.map(id => RUNS[id]).filter(Boolean), dry = RUN_IDS.drywet.map(id => RUNS[id]).filter(Boolean), proj = RUNS["project-1"];
  const allRuns = [...wet, ...dry];
  const calls = allRuns.map(r => r.stats?.calls || r.steps.length);
  const maxCalls = calls.length ? Math.max(...calls) : null;
  const wetF = wet.filter(isFailed), dryF = dry.filter(isFailed);
  const wetFail = wetF[0], dryFail = dryF[0];
  const bench = wetF[0] || wet[0];
  const gsasRun = dryF.find(r => r.steps.some(s => /refines well as orthorhombic/i.test(s.say || ""))) || dryF[0] || dry[0];
  const pd = IDX.project && (IDX.project.protocol || IDX.project.expert_protocol);
  const wp = IDX.wet && (IDX.wet.protocol || IDX.wet.expert_protocol), dp = IDX.drywet && (IDX.drywet.protocol || IDX.drywet.expert_protocol);
  const passN = a => a.filter(r => r.outcome && r.outcome.pass).length;
  const rate = (p) => p && (p.success_rate ?? p.rate);
  const bars = (rows) => `<div class="proof"><div class="proof-h"><span>Share of recorded runs passed, Claude Opus 5.5 at medium effort</span></div><div class="bars">${rows.filter(Boolean).map(([l, v, cls]) => `<div class="bar ${cls || ""}"><span>${esc(l)}</span><div class="track"><div class="fill" style="width:${Math.round((v || 0) * 100)}%"></div></div><span class="n">${pct(v)}</span></div>`).join("")}</div></div>`;
  const contrast = p => (p && p.contrast || []).map(c => [c.name, c.success_rate ?? c.rate, ""]);

  const C = [];
  C.push({
    h: "Each tool call is one lab operation.",
    p: `There are no high-level actions like "make sample". Weighing, grinding and heating are separate tool calls, and each one changes the simulated sample. Recorded runs take up to <b class="mono">${maxCalls == null ? "…" : fmt(maxCalls)}</b> calls${proj ? `; the long project runs <b class="mono">${fmt(proj.stats?.calls ?? proj.steps.length)}</b> actions over <b class="mono">${fmt(Math.round(proj.stats?.sim_hours ?? 0))}</b> simulated hours` : ""}.`,
    buy: "the score is computed only at delivery, so credit assignment has to reach back across a long episode of real operations.",
    proof: pairProof(bench, findStep(bench, s => /^seal/i.test(s.tool)) || findStep(bench, s => /heat/i.test(s.tool)), bench && bench.title, { before: 14, after: 6, vars: ["mass_g", "oxide_pct"] }),
  });
  C.push({
    h: "The agent never sees the true state.",
    p: "Hidden variables change the outcome. A sample can pick up moisture from the air. A reagent bottle can be less pure than its label says. A sealed tube can leak air, and a furnace can run hotter than it is set. None of this appears in an observation. It shows up later, in the measurements.",
    buy: "the model has to form and test hypotheses about hidden causes from indirect evidence.",
    proof: pairProof(wetFail, wetFail && (findStep(wetFail, s => s.i === (wetFail.failure.chain || [])[1]?.step) || findStep(wetFail, s => s.events.length && s.flag === "fault")), wetFail && wetFail.title, { before: 10, after: 6, vars: ["leak", "oxide_pct", "dopant_metal_pct"] }),
  });
  C.push({
    h: "Measurements are computed from the hidden state.",
    p: "Each instrument turns the sample's true state into data with its own physics model. The agent gets diffraction patterns (which show crystal structure), magnetic curves, composition readings and optical spectra, and has to interpret them. In the dry + wet chain it also drives real scientific desktop software through a GUI. It fits crystal structures in GSAS-II and runs the quantum-mechanical simulations (DFT) itself.",
    buy: "every reading comes from the same hidden state through the same physics, so the readings agree with each other and the agent has to reason from the data.",
    proof: pairProof(gsasRun, findStep(gsasRun, s => /refines well as orthorhombic/i.test(s.say || "")) || findStep(gsasRun, s => /gsas/i.test(s.say || "")), gsasRun && gsasRun.title, { before: 12, after: 3, vars: ["x_true", "distorted", "single_phase"] }),
  });
  C.push({
    h: "Early lab mistakes carry into later simulation steps.",
    p: "The dry + wet chain has three stages. The output of stage 1 is the input of stage 2, and the output of stage 2 decides what the agent does in stage 3. The agent measures how much of an added element (the dopant) went into its sample. That number sets up a simulation, and the simulation's result decides which film it grows last. A sloppy fit early on becomes a wrong prediction two stages later.",
    buy: "the reward depends on a chain of the model's own earlier results, as it does in multi-stage research.",
    proof: pairProof(dryFail, dryFail && (findStep(dryFail, s => s.flag === "miss" && /dft/i.test(s.tool)) || findStep(dryFail, s => s.flag === "miss") || dryFail.steps[Math.max(0, dryFail.failStep)]), dryFail && dryFail.title, { before: 16, after: 6, vars: ["u_true", "dft_gap_err"] }),
  });
  C.push({
    h: "Graded against the simulator's true state.",
    p: "Each delivered answer is compared with the simulator's true values, such as the sample's composition, its crystal structure and the temperature at which its magnetic order sets in. Each check has a tolerance stated in the task, for example ± 3 K. No language model judges anything. Runs replay deterministically, so every reward can be reproduced from the action log.",
    buy: "the reward is a rule-based comparison with ground truth, with no LLM judge. Separately, the hidden state recorded at every step can supervise the process as well as the outcome.",
    proof: (() => { const d = [...bench.steps].reverse().find(x => /deliver/i.test(x.tool)) || bench.steps[bench.steps.length - 1]; return pairProof(bench, d, bench.title + ", delivery", { before: 6, after: 0, vars: ["x_lattice", "distorted", "tn_true_k"] }); })(),
  });
  C.push({
    h: "Claude Opus 5.5 still fails, and each failure has a named step.",
    p: `Claude Opus 5.5 at medium effort passed <b class="mono">${passN(wet)}</b> of <b class="mono">${wet.length}</b> wet-bench runs and <b class="mono">${passN(dry)}</b> of <b class="mono">${dry.length}</b> dry + wet chains. Every failure has a named step, such as a missing check, a sample sealed after it had absorbed moisture, or a simulation run on too coarse a grid for its numbers to settle.`,
    buy: "each marked step shows what the agent saw and what was true at that moment, so you can see which skill it lacked.",
    proof: `<div class="stack">${bars([["Claude Opus 5.5, wet bench", wet.length ? passN(wet) / wet.length : 0, "exp"], ["Claude Opus 5.5, dry + wet chain", dry.length ? passN(dry) / dry.length : 0, "exp"]])}${(() => { const f2 = wetF[1] || wetFail; return f2 ? pairProof(f2, f2.steps[Math.max(0, f2.failStep)], f2.title, { before: 14, after: 0, vars: ["second_phase_pct", "dopant_metal_pct", "tn_true_k"] }) : ""; })()}</div>`,
  });
  C.push({
    h: "Experts can solve them. Shortcuts fail.",
    p: "Each environment ships with an expert-annotated protocol. It is the step-by-step procedure that a careful experimentalist would follow. In the chart below it passes 75% to 100% of tasks. Common shortcuts that skip a check or a recalibration pass 0% to 46%.",
    buy: "an expert procedure reaches near-full success and the obvious shortcuts fall far short, so a high score requires the checks each task calls for.",
    proof: `<div class="stack">${protoProof(wp, dp, pd)}${(() => { const r3 = dryF.find(r => (r.failure?.chain || []).some(c => /assum/i.test(c.text))) || dryF[1] || dryFail; if (!r3) return ""; const c = (r3.failure.chain || []).find(c => /assum/i.test(c.text)) || r3.failure.chain[0]; const st = r3.steps.find(x => x.i >= c.step); return pairProof(r3, st, r3.title + ", a shortcut", { before: 8, after: 3, vars: ["ground_true", "film_strain_pct", "u_true"] }); })()}</div>`,
  });
  $("#claims").innerHTML = C.map(claimHTML).join("");
}

const shortName = n => String(n || "").replace(/^Naive procedure:\s*/i, "");
function protoProof(wp, dp, pd) {
  const grp = (title, rows) => `<div class="pgroup"><div class="pg-h">${esc(title)}</div><div class="bars">${rows.map(([l, v, cls, note]) => `<div class="bar ${cls || ""}"><span>${esc(l)}${note ? ` <em class="mono">${esc(note)}</em>` : ""}</span><div class="track"><div class="fill" style="width:${Math.round((v || 0) * 100)}%"></div></div><span class="n">${pct(v)}</span></div>`).join("")}</div></div>`;
  let h = "";
  if (wp && wp.by_budget) wp.by_budget.forEach(b => {
    h += grp(`Wet bench, ${b.budget_label.toLowerCase()}`, [["Expert-annotated protocol", b.success_rate, "exp"], ...(b.contrast || []).map(c => [shortName(c.name), c.success_rate, ""])]);
  });
  if (dp) {
    const cs = (dp.contrast || []).slice().sort((a, b) => (b.mean_score || 0) - (a.mean_score || 0)).slice(0, 4);
    h += grp(`Dry + wet chain, all three stages correct (${dp.n_cases} tasks)`, [["Expert-annotated protocol", dp.success_rate, "exp"], ...cs.map(c => [shortName(c.name), c.success_rate, ""])]);
  }
  if (pd) h += grp(`Long project, every deliverable correct`, [["Expert-annotated protocol", pd.success_rate, "exp"], ...(pd.contrast || []).map(c => [shortName(c.name), c.success_rate, ""])]);
  return `<div class="proof"><div class="proof-h"><span>Success rate: expert-annotated protocol vs other strategies</span></div>${h}</div>`;
}
function buildCompare() {
  const rows = [
    ["State", "Mostly observable: the page, file or repository is the state", "Simulated and hidden; seen only through measurements"],
    ["A step", "A click or an API call whose effect is usually visible right away", "One lab operation that changes the simulated sample, often with effects that show up only later"],
    ["Horizon", "Often tens to hundreds of steps", "Hundreds of operations and, in the long project, about six weeks of simulated lab time"],
    ["Observations", "Text and screenshots of the app", "Instrument data computed from the hidden state, plus the screens of real scientific software"],
    ["Dependencies", "Subtasks that are often independent", "Lab results feed simulations, which decide the next experiment"],
    ["Grading", "Unit tests, state checks, string match or a language-model judge", "Comparison with the hidden true state, deterministic and replayable"],
    ["Failure analysis", "A final score and the visible trajectory", "Step-level cause chain with the hidden state at every step"],
  ];
  $("#cmpBody").innerHTML = rows.map(r => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("");
}

function opsOf(runs) { const m = new Map(); runs.forEach(r => r && r.steps.forEach(s => m.set(s.tool, (m.get(s.tool) || 0) + 1))); return [...m.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]); }
const INS = /xrd|scan|squid|edx|eds|measure|spectr|gap|refine|gsas|dft|pw|calc|mount|acquire|quantify|export/i;
function buildEnvs() {
  const wet = RUN_IDS.wet.map(id => RUNS[id]).filter(Boolean), dry = RUN_IDS.drywet.map(id => RUNS[id]).filter(Boolean), proj = RUNS["project-1"];
  const wvars = wet[0] ? wet[0].hvars : [];
  const wops = opsOf(wet);
  $("#envWet").innerHTML = `<div><h3>Wet bench</h3><div class="tag">Make a material, then measure it</div>
    <p>The agent gets a target material and a property it must hit, such as the temperature at which its magnetic order sets in, within a few kelvin. It works one lab operation at a time, with a glovebox, balance, mortar, press, sealed glass tubes (ampoules) and furnaces. It checks each product with diffraction (crystal structure), magnetometry (magnetism) and elemental analysis (composition). Materials, measurements and days are all on a budget.</p>
    <p class="facts">The recorded runs use ${wops.length} distinct operations and track ${wvars.length} hidden variables at every step. The longest of the ${wet.length} recorded Claude Opus 5.5 runs takes ${fmt(wet.length ? Math.max(...wet.map(r => r.stats?.calls || r.steps.length)) : 0)} calls.</p></div>
    <div class="flow"><div class="flow-h">Operations the agent calls, as recorded (instruments highlighted)</div><div class="ops">${wops.map(o => `<span class="op ${INS.test(o) ? "ins" : ""}">${esc(o)}</span>`).join("")}</div>
    <div class="flow-h" style="margin-top:22px">What changes underneath, invisible to the agent</div><ul class="hid">${wvars.map(v => `<li>${esc(v.label)}${v.unit ? `<span>${esc(v.unit)}</span>` : v.kind === "bool" ? `<span>yes / no</span>` : ""}</li>`).join("")}</ul></div>`;
  const dops = opsOf(dry);
  $("#envDry").innerHTML = `<div><h3>Dry + wet chain</h3><div class="tag">Lab work (wet) plus computer simulation (dry), on one budget of 62 lab actions</div>
    <p>Three stages share one action budget and one lab notebook. First the agent makes a doped compound and fits its crystal structure in GSAS-II, a desktop program. Next it measures the sample's optical gap, the light energy it starts to absorb. It then tunes one parameter of a physics simulation until the simulation reproduces that measurement. Finally it uses the tuned simulation to predict how much to strain (stretch or squeeze) a thin film to change its magnetic order, and grows the film to test the prediction.</p>
    ${proj ? `<p>The long version runs the same science as a multi-week project. Several dopants run in parallel, furnaces and instruments are shared, instruments drift, and there is a deadline.</p>` : ""}
    <p class="facts">${dry.length} recorded Claude Opus 5.5 runs include a screen frame for every GUI step.${proj ? ` The long-project run takes ${fmt(proj.stats?.calls ?? proj.steps.length)} actions over ${fmt(Math.round(proj.stats?.sim_hours ?? 0))} simulated hours.` : ""}</p></div>
    <div class="flow"><div class="flow-h">The chain</div><div class="stages">
      <div class="stage"><b>Make and fit</b><span>Make the doped pellet, work out what went wrong with an earlier pilot batch, and fit the dopant fraction from diffraction data in GSAS-II.</span></div>
      <div class="stage"><b>Measure and tune the simulation</b><span>Measure the optical gap of the delivered sample. Find the Hubbard U (an interaction strength in the DFT+U simulation) that reproduces it, and show the simulation grid is fine enough (k-point convergence).</span></div>
      <div class="stage"><b>Predict and verify</b><span>Use the delivered U to predict the strain that changes the film's magnetic order, choose a base crystal to grow on (the substrate), grow films and check them.</span></div>
    </div><p class="carry">Each stage is graded against the hidden truth, and each one inherits the agent's own earlier numbers. An error in stage one is still visible in stage three.</p>
    ${dops.length ? `<div class="flow-h" style="margin-top:18px">Operations and applications used in recorded runs</div><div class="ops">${dops.slice(0, 40).map(o => `<span class="op ${INS.test(o) ? "ins" : ""}">${esc(o)}</span>`).join("")}</div>` : ""}
    ${proj ? `<div class="lanes" id="projLanes"></div>` : ""}</div>`;
  if (proj) $("#projLanes").innerHTML = projectLanes(proj);
}
function projectLanes(p) {
  const st = p.steps.filter(s => s.t_h != null); if (!st.length) return "";
  const lanes = [...new Set(st.map(s => s.lane || s.stage || "lab"))].slice(0, 8);
  const T = Math.max(...st.map(s => (s.t_end_h ?? s.t_h))), W = 1000, LH = 30, L = 330, H = lanes.length * LH + 30;
  let g = lanes.map((l, j) => `<text x="0" y="${j * LH + 18}" font-size="15" fill="currentColor" opacity=".7" font-family="Geist, sans-serif">${esc(((p.stages || []).find(x => x.key === l)?.label || l).slice(0, 40))}</text>`).join("");
  st.forEach(s => { const j = lanes.indexOf(s.lane || s.stage || "lab"); if (j < 0) return; const x0 = L + s.t_h / T * (W - L), x1 = L + (s.t_end_h ?? s.t_h + 1) / T * (W - L); g += `<rect x="${x0}" y="${j * LH + 3}" width="${Math.max(1.2, x1 - x0)}" height="${LH - 7}" rx="2" fill="${s.flag === "drift" ? "#F2A93B" : s.flag ? "#E5484D" : "currentColor"}" opacity="${s.flag ? .9 : .55}"/>`; });
  g += `<text x="${L}" y="${H - 4}" font-size="14" fill="currentColor" opacity=".6" font-family="Geist Mono, monospace">0 h</text><text x="${W}" y="${H - 4}" text-anchor="end" font-size="14" fill="currentColor" opacity=".6" font-family="Geist Mono, monospace">${fmt(Math.round(T))} h</text>`;
  return `<div class="flow-h" style="margin-top:18px">Long project, one complete run: actions on parallel lanes over simulated time</div><svg viewBox="0 0 ${W} ${H}" aria-label="Actions on parallel lanes over simulated hours">${g}</svg>`;
}

/* ---------- explorer: story-style player over one failed run ---------- */
const ex = { run: null, k: 0, timer: null, playing: false, hl: true, speed: 1, chainAt: {}, chainIdx: [], lanes: [], mapW: 0, mapX: null };
const BORING = /^gui\.(wait|scroll|hotkey|press|screenshot|move|mouse_move)$/;
const boring = s => BORING.test(s.tool) && !s.say && !s.events.length && !s.flag;
const FLAGTXT = { drift: "Hidden drift", fault: "Hidden fault", miss: "Missed by the agent", good: "Caught by the agent" };
const kindOf = s => /^gui\./.test(s.tool) ? "GUI" : /dft/.test(s.tool) ? "DFT" : /deliver|commit/.test(s.tool) ? "DELIVER" : INS.test(s.tool) ? "MEASURE" : "BENCH";
const LANE_PREF = { wet: ["dopant_metal_pct", "oxide_pct", "furnace_true_c", "x_lattice", "tn_true_k"], drywet: ["x_true", "u_true", "dft_gap_err", "gap_true", "furnace_true_c"] };
function mapLanes(r) {
  const varies = v => { const xs = r.steps.map(s => s.full[v.key]).filter(x => typeof x === "number"); return xs.length > 0 && Math.max(...xs) > Math.min(...xs); };
  const pref = (LANE_PREF[r.env] || []).map(k => r.hvars.find(v => v.key === k)).filter(v => v && varies(v));
  const rest = numVars(r).filter(v => !pref.includes(v) && varies(v));
  const out = [...pref, ...rest].slice(0, 3);
  const bud = r.vars.find(v => v.key === "budget_used"); if (bud) out.push({ ...bud, label: "Budget used", unit: "", grey: true });
  return out;
}
function buildList() {
  const card = r => `<button class="rl-btn" data-run="${r.id}" aria-pressed="false"><span class="t">${esc(r.title)}</span><span class="s ${scoreCls(r)}">${esc(scoreTxt(r))}</span><span class="d">${esc(r.failure ? r.failure.headline : r.outcome?.headline || "")}</span><span class="m">${r.steps.length} steps · ${(r.failure?.chain || []).length} failure points marked</span></button>`;
  const grp = (h, ids) => { const rs = ids.map(id => RUNS[id]).filter(isFailed); return rs.length ? `<div class="rl-group"><h4>${h}</h4>${rs.map(card).join("")}</div>` : ""; };
  $("#runList").innerHTML = grp("Wet bench · Claude Opus 5.5", RUN_IDS.wet) + grp("Dry + wet chain · Claude Opus 5.5", RUN_IDS.drywet);
  $("#runList").addEventListener("click", e => { const b = e.target.closest(".rl-btn"); if (b) openRun(b.dataset.run, 0, false); });
}
const ICO = {
  prev: `<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  next: `<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  play: `<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>`,
};
function openRun(id, k = 0, scroll = true) {
  const r = RUNS[id]; if (!r) return;
  stopPlay();
  ex.run = r; ex.k = Math.max(0, Math.min(k, r.steps.length - 1)); ex.mapW = 0;
  document.querySelectorAll(".rl-btn").forEach(b => b.setAttribute("aria-pressed", b.dataset.run === id));
  const f = r.failure, chain = (f && f.chain) || [];
  ex.chainAt = {};
  ex.chainIdx = chain.map((c, j) => { const idx = r.steps.findIndex(s => s.i >= c.step); if (idx >= 0 && !(idx in ex.chainAt)) ex.chainAt[idx] = j; return idx; });
  ex.lanes = mapLanes(r);
  const B = r.stats?.budget || 0;
  $("#runMain").innerHTML = `<div class="rm-head"><div class="rm-title"><h3>${esc(r.title)}</h3><span class="score ${scoreCls(r)}">${esc(scoreTxt(r))}</span></div>
    <p class="rm-task clamp" id="exTask">${esc(r.task)}</p><button class="rm-more" id="exMore" aria-expanded="false" aria-controls="exTask">Show the full task</button>
    <div class="rm-stats"><span>Model <b>${esc(r.model)}${r.effort ? ", " + esc(r.effort) + " effort" : ""}</b></span><span>Calls <b>${fmt(r.stats?.calls ?? r.steps.length)}</b></span>${r.stats?.sim_hours ? `<span>Simulated time <b>${fmt(r.stats.sim_hours)} h</b></span>` : ""}${r.stats?.wall_min ? `<span>Wall time <b>${fmt(r.stats.wall_min)} min</b></span>` : ""}${B ? `<span>Budget <b>${fmt(r.stats.budget_used)} / ${fmt(B)}</b></span>` : ""}</div>
    ${r.outcome?.items?.length ? `<div class="rm-items">${r.outcome.items.map(it => `<span class="${it.score >= 1 ? "ok" : "no"}">${esc(it.name)}<b>${esc(fmt(it.score))}</b></span>`).join("")}</div>` : ""}
    ${f ? `<div class="rm-fail"><b>Where it went wrong.</b> ${esc(f.headline)}${chain.length ? `<ol>${chain.map((c, j) => `<li><button data-jumpi="${c.step}"><i class="pin">${j + 1}</i>Step ${c.step}</button> ${esc(c.text)}</li>`).join("")}</ol>` : ""}</div>` : ""}
    </div>
    <div class="player">
      <div class="pl-ctl"><button id="exPrev" aria-label="Previous step">${ICO.prev}</button><button id="exPlay" class="pl-play">${ICO.play}<span>Play</span></button><button id="exNext" aria-label="Next step">${ICO.next}</button><button id="exFlag">Next failure point</button><button id="exHl" aria-pressed="${ex.hl}" title="Skip idle screen steps: waits, scrolls and key presses">Skip idle steps</button><select id="exSpeed" aria-label="Playback speed"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select><span class="pos" id="exPos"></span></div>
      <div class="pl-map" id="exMap"></div>
      <div class="pl-grid">
        <div class="pl-stage">
          <div class="pl-screen" id="exScreen"><img alt="" hidden><div class="pl-empty" id="exEmpty"></div><div class="pl-tag" id="exTag" hidden></div><div class="pl-ov" id="exOv"></div></div>
          <div class="pl-words"><div class="t">What the model said <span id="exWordsAt"></span></div><p id="exWords">Nothing yet.</p></div>
        </div>
        <div class="pl-sidewrap"><aside class="pl-side">
          <div><div class="t">Now</div><div class="pl-now" id="exNow"></div></div>
          ${B ? `<div><div class="t">Budget <span id="exBud"></span></div><div class="pl-bud">${Array.from({ length: B }, (_, i) => `<i id="bc${i}"></i>`).join("")}</div></div>` : ""}
          <div><div class="t">What was true <span>hidden from the agent</span></div><div id="exEv"></div><table class="hs"><tbody id="exHs"></tbody></table></div>
          <div><div class="t">Set or seen by the agent</div><table class="hs"><tbody id="exKn"></tbody></table></div>
        </aside></div>
      </div>
    </div>`;
  $("#runMain").onclick = e => { const ji = e.target.closest("[data-jumpi]"); if (ji) { setStep(r.steps.findIndex(s => s.i >= +ji.dataset.jumpi)); $("#exMap").scrollIntoView({ block: "nearest", behavior: REDUCED ? "auto" : "smooth" }); } };
  $("#exMore").onclick = e => { const t = $("#exTask"), open = t.classList.toggle("clamp") === false; e.currentTarget.setAttribute("aria-expanded", open); e.currentTarget.textContent = open ? "Show less" : "Show the full task"; };
  $("#exPrev").onclick = () => setStep(ex.k - 1); $("#exNext").onclick = () => setStep(ex.k + 1);
  $("#exPlay").onclick = () => ex.playing ? stopPlay() : startPlay();
  $("#exFlag").onclick = () => { const xs = ex.chainIdx.filter(i => i >= 0).sort((a, b) => a - b); const n = xs.find(i => i > ex.k); setStep(n == null ? xs[0] : n); };
  $("#exHl").onclick = e => { ex.hl = !ex.hl; e.currentTarget.setAttribute("aria-pressed", ex.hl); };
  $("#exSpeed").value = String(ex.speed); $("#exSpeed").onchange = e => { ex.speed = +e.target.value || 1; };
  drawStep();
  if (scroll) document.getElementById("runs").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
}
function drawMap() {
  const r = ex.run, el = $("#exMap"); if (!r || !el) return;
  const W = Math.max(280, el.clientWidth), n = r.steps.length, PADL = 10, PADR = 10;
  const X = i => PADL + (n < 2 ? 0 : i / (n - 1)) * (W - PADL - PADR);
  const SB = 22, PIN = 26, TK = 18, LH = 54, lanes = ex.lanes, H = SB + PIN + TK + lanes.length * LH + 22;
  let g = "";
  (r.stages || []).forEach((st, j) => {
    const a = r.steps.findIndex(s => s.i >= st.from), b = r.steps.findIndex(s => s.i > st.to); if (a < 0) return;
    const x0 = X(a), x1 = b < 0 ? W - PADR : X(b), w = Math.max(1, x1 - x0), lab = st.label || st.key, max = Math.floor((w - 10) / 6.4);
    g += `<rect x="${x0.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${SB - 4}" rx="3" fill="${j % 2 ? "#1C2029" : "#252B38"}"/>`;
    const txt = lab.length <= max ? lab : max >= 12 ? lab.slice(0, max - 1) + "…" : String(j + 1);
    if (max >= 1) g += `<text x="${(x0 + 6).toFixed(1)}" y="13" fill="#A3A8B3" font-size="11" font-family="Geist, sans-serif">${esc(txt)}<title>${esc(lab)}</title></text>`;
  });
  const ty = SB + PIN;
  r.steps.forEach((s, i) => {
    const c = s.flag === "drift" ? "#F2A93B" : (s.flag === "fault" || s.flag === "miss") ? "#E5484D" : s.flag === "good" ? "#3FB37F" : /^gui\./.test(s.tool) ? "#3A4150" : "#7C8496";
    const h = s.flag ? TK : /^gui\./.test(s.tool) ? 6 : 11;
    g += `<rect x="${(X(i) - .6).toFixed(1)}" y="${ty + TK - h}" width="1.3" height="${h}" fill="${c}"/>`;
  });
  lanes.forEach((v, j) => {
    const y0 = ty + TK + 6 + j * LH, base = y0 + LH - 6;
    const xs = r.steps.map(s => typeof s.full[v.key] === "number" ? s.full[v.key] : null), vals = xs.filter(x => x !== null);
    let lo = Math.min(...vals), hi = Math.max(...vals); if (hi === lo) { hi += 1; lo -= 1; }
    const Y = x => base - (x - lo) / (hi - lo) * (LH - 26);
    let d = "", start = null, lastX = 0;
    xs.forEach((x, i) => { if (x === null) return; const px = X(i).toFixed(1), py = Y(x).toFixed(1); if (start === null) { start = px; d += `M${px},${py}`; } else d += `L${px},${py}`; lastX = px; });
    const a = start === null ? "" : `${d}L${lastX},${base}L${start},${base}Z`;
    const col = v.grey ? "#8B919D" : "#C9CDD6";
    g += `<line x1="${PADL}" x2="${W - PADR}" y1="${base}" y2="${base}" stroke="#272C37"/>`;
    g += `<path d="${a}" fill="${col}" fill-opacity=".12"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.5"/>`;
    g += `<text x="${PADL}" y="${y0 + 11}" fill="#A3A8B3" stroke="#0B0D12" stroke-width="4" paint-order="stroke" font-size="11.5" font-family="Geist, sans-serif">${esc(v.label)}${v.unit ? " (" + esc(v.unit) + ")" : ""}</text><text id="mapV${j}" x="${W - PADR}" y="${y0 + 11}" text-anchor="end" fill="#E9EAEE" stroke="#0B0D12" stroke-width="4" paint-order="stroke" font-size="11.5" font-family="Geist Mono, monospace"></text>`;
  });
  // lay pins out left to right with a minimum gap, then pull back from the right edge if they overflow
  const GAP = 20, pins = ex.chainIdx.map(idx => idx < 0 ? null : X(idx)), pos = pins.slice();
  let last = -99; pos.forEach((x, j) => { if (x == null) return; pos[j] = Math.max(x, last + GAP); last = pos[j]; });
  let lim = W - PADR - 9; for (let j = pos.length - 1; j >= 0; j--) { if (pos[j] == null) continue; pos[j] = Math.min(pos[j], lim); lim = pos[j] - GAP; }
  ex.chainIdx.forEach((idx, j) => {
    if (idx < 0) return; const x = X(idx);
    const px = pos[j];
    g += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${SB + 18}" y2="${H - 18}" stroke="#E5484D" stroke-opacity=".55" stroke-dasharray="3 3"/>`;
    if (Math.abs(px - x) > 1) g += `<path d="M${px.toFixed(1)},${SB + 18} L${x.toFixed(1)},${SB + 24}" stroke="#E5484D" stroke-opacity=".7" fill="none"/>`;
    g += `<g class="pinm" data-k="${idx}"><circle cx="${px.toFixed(1)}" cy="${SB + 10}" r="9" fill="#E5484D"/><text x="${px.toFixed(1)}" y="${SB + 14}" text-anchor="middle" fill="#fff" font-size="11" font-weight="600" font-family="Geist, sans-serif">${j + 1}</text></g>`;
  });
  const t0 = r.steps[0], tN = r.steps[n - 1];
  g += `<text x="${PADL}" y="${H - 4}" fill="#8B919D" font-size="11" font-family="Geist Mono, monospace">step ${t0.i}</text><text x="${W - PADR}" y="${H - 4}" text-anchor="end" fill="#8B919D" font-size="11" font-family="Geist Mono, monospace">step ${tN.i}${tN.t_h != null && r.env === "wet" ? " · day " + fmt(Math.round(tN.t_h / 24 * 10) / 10) : ""}</text>`;
  g += `<rect id="mapCur" x="0" y="0" width="2" height="${H - 16}" fill="#E9EAEE"/>`;
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="slider" tabindex="0" aria-label="Run map: every step, the failure points and the hidden state over the whole run" aria-valuemin="1" aria-valuemax="${n}">${g}</svg>`;
  ex.mapW = W; ex.mapX = X;
  const svg = el.querySelector("svg");
  const pick = ev => { const b = svg.getBoundingClientRect(); const t = (ev.clientX - b.left - PADL) / (b.width - PADL - PADR); setStep(Math.round(Math.max(0, Math.min(1, t)) * (n - 1))); };
  svg.onpointerdown = ev => { const p = ev.target.closest(".pinm"); if (p) { setStep(+p.dataset.k); return; } svg.setPointerCapture(ev.pointerId); pick(ev); svg.onpointermove = pick; };
  svg.onpointerup = () => { svg.onpointermove = null; };
  svg.onkeydown = ev => { if (ev.key === "ArrowRight") { setStep(ex.k + 1); ev.preventDefault(); } if (ev.key === "ArrowLeft") { setStep(ex.k - 1); ev.preventDefault(); } };
}
function setStep(k) {
  const r = ex.run; if (!r || k == null || k < 0 || isNaN(k)) return;
  ex.k = Math.max(0, Math.min(k, r.steps.length - 1)); drawStep();
  if (ex.playing) { clearTimeout(ex.timer); ex.timer = setTimeout(tick, dwell(ex.k)); }
}
function dwell(k) { const s = ex.run.steps[k]; let d = 650; if (k in ex.chainAt) d = 3200; else if (s.flag) d = 1800; else if (s.say) d = 1500; else if (/^gui\./.test(s.tool)) d = 420; return d / ex.speed; }
function nextIdx(k) { const r = ex.run; let j = k + 1; if (ex.hl) while (j < r.steps.length - 1 && boring(r.steps[j])) j++; return j; }
function tick() { const r = ex.run; if (!ex.playing || !r) return; if (ex.k >= r.steps.length - 1) return stopPlay(); ex.k = nextIdx(ex.k); drawStep(); ex.timer = setTimeout(tick, dwell(ex.k)); }
function startPlay() {
  if (!ex.run) return; ex.playing = true; clearTimeout(ex.timer);
  if (ex.k >= ex.run.steps.length - 1) { ex.k = 0; drawStep(); }
  ex.timer = setTimeout(tick, dwell(ex.k));
  const b = $("#exPlay"); if (b) b.querySelector("span").textContent = "Pause";
}
function stopPlay() { ex.playing = false; clearTimeout(ex.timer); ex.timer = null; const b = $("#exPlay"); if (b) b.querySelector("span").textContent = "Play"; }
const preloaded = new Set();
function drawStep() {
  const r = ex.run, k = ex.k, s = r.steps[k], prev = k > 0 ? r.steps[k - 1].full : {};
  const mapEl = $("#exMap"); if (!mapEl) return;
  if (!ex.mapW || Math.abs(mapEl.clientWidth - ex.mapW) > 2) drawMap();
  const cur = $("#mapCur"); if (cur) cur.setAttribute("x", (ex.mapX(k) - 1).toFixed(1));
  const svg = mapEl.querySelector("svg"); if (svg) svg.setAttribute("aria-valuenow", k + 1);
  ex.lanes.forEach((v, j) => { const t = $("#mapV" + j); if (t) { const x = s.full[v.key]; t.textContent = x == null ? "–" : fmt(x) + (v.unit ? " " + v.unit : ""); } });
  const stage = (r.stages || []).find(x => x.key === s.stage);
  $("#exPos").textContent = `Step ${s.i} of ${r.steps[r.steps.length - 1].i}`;
  // screen: the agent's latest screen frame, or the latest instrument plot on the bench
  const fr = r.steps.slice(0, k + 1).reverse().find(x => x.frame);
  const img = $("#exScreen img"), empty = $("#exEmpty");
  if (fr) {
    img.hidden = false; empty.hidden = true;
    if (img.dataset.want !== fr.frame) { setImg(img, fr.frame); img.alt = /\.svg$/.test(fr.frame) ? `Instrument data returned at step ${fr.i}` : `Agent's screen after step ${fr.i}`; }
    $("#exScreen").classList.toggle("plot", /\.svg$/.test(fr.frame));
  } else {
    img.hidden = true; empty.hidden = false;
    empty.textContent = r.env === "wet" ? "The agent works this bench through tool calls. Instrument data appears here as soon as a measurement returns." : "Waiting for the first screen.";
  }
  let c = 0; for (let d = k + 1; d < r.steps.length && c < 6; d++) { const f2 = r.steps[d].frame; if (f2 && !preloaded.has(f2)) { preloaded.add(f2); prefetch(f2); c++; } }
  const tag = $("#exTag");
  if (s.flag) { tag.hidden = false; tag.className = "pl-tag f-" + s.flag; tag.textContent = FLAGTXT[s.flag] || s.flag; } else tag.hidden = true;
  // overlay: the call, what came back and, near a failure point, what went wrong
  const kind = kindOf(s);
  let call = "";
  for (let j = k; j >= Math.max(0, k - 10); j--) if (j in ex.chainAt) { const ci = ex.chainAt[j]; call = `<div class="pl-call ${j === k ? "now" : ""}"><i class="pin">${ci + 1}</i><span>${esc(r.failure.chain[ci].text)}</span></div>`; break; }
  const plotNote = fr && /\.svg$/.test(fr.frame) ? `<span class="src">plot from step ${fr.i}</span>` : "";
  $("#exOv").innerHTML = `${call}<div class="pl-op"><span class="kind k-${kind}">${kind}</span><b>${esc(s.tool)}</b> <span class="a">${esc((s.args || "").slice(0, 110))}</span>${plotNote}</div>${s.obs ? `<div class="pl-obs">${esc(s.obs.replace(/\s+/g, " ").slice(0, 200))}${s.obs.length > 200 ? "…" : ""}</div>` : ""}`;
  let said = null; for (let j = k; j >= 0; j--) if (r.steps[j].say) { said = r.steps[j]; break; }
  $("#exWords").textContent = said ? said.say : "Nothing yet.";
  $("#exWordsAt").textContent = said ? `step ${said.i}` : "";
  $("#exWords").parentElement.classList.toggle("fresh", !!(said && said.k === k));
  $("#exNow").innerHTML = `<b>${esc(stage ? stage.label : s.stage || "")}</b>${s.t_h != null ? `<span>${r.env === "wet" ? "day " + fmt(Math.round(s.t_h / 24 * 10) / 10) + " · " : ""}t = ${fmt(Math.round(s.t_h * 10) / 10)} h</span>` : ""}`;
  const B = r.stats?.budget || 0;
  if (B) {
    const used = s.full.budget_used || 0, pu = prev.budget_used || 0;
    for (let i = 0; i < B; i++) { const el = $("#bc" + i); if (el) el.className = i < used ? (i >= pu && k > 0 ? "on just" : "on") : ""; }
    $("#exBud").textContent = `${fmt(used)} / ${fmt(B)}`;
  }
  $("#exEv").innerHTML = s.events.length ? `<div class="st-ev">${s.events.map(e => `<div class="${s.flag === "fault" || s.flag === "miss" ? "red" : ""}">${esc(e)}</div>`).join("")}</div>` : `<p class="pl-quiet">No hidden change at this step.</p>`;
  const row = v => { const cv = s.full[v.key]; const ch = k > 0 && JSON.stringify(cv) !== JSON.stringify(prev[v.key]); return `<tr class="${ch ? "chg" : ""}"><td>${esc(v.label)}</td><td>${esc(fmt(cv))}${v.unit && cv != null ? " " + esc(v.unit) : ""}</td></tr>`; };
  $("#exHs").innerHTML = r.hvars.map(row).join("");
  $("#exKn").innerHTML = r.vars.filter(v => v.known).map(row).join("");
  const ae = document.activeElement; if (ae && ae.closest && ae.closest("#exMap")) { const s2 = $("#exMap svg"); if (s2 && ae !== s2) s2.focus(); }
}
addEventListener("resize", () => { if (ex.run) { ex.mapW = 0; drawStep(); } });

function buildDeliv() {
  const d = [
    ["Environments", "The wet bench and the dry + wet chain, including the long-project version, as runnable services. Agents act through tool calls, and in the dry + wet chain also through a Linux desktop."],
    ["Task sets", "Sets of distinct tasks per environment, each with its own target material, budget and hidden conditions."],
    ["Expert-annotated protocols", "A reference procedure per environment, with recorded runs and success rates."],
    ["Graders", "Deterministic graders that compare delivered answers with the hidden true state; no model in the loop."],
    ["Replays", "Every run as an action log with the full hidden state at every step and, for GUI runs, a screen frame per call."],
  ];
  $("#deliv").innerHTML = d.map(x => `<div><dt>${x[0]}</dt><dd>${x[1]}</dd></div>`).join("");
}
function heroFacts() {
  const all = Object.values(RUNS); const steps = all.reduce((a, r) => a + r.steps.length, 0);
  const longest = all.filter(r => r.env !== undefined).reduce((m, r) => Math.max(m, r.stats?.calls || r.steps.length), 0);
  const fl = all.filter(isFailed).filter(r => !/^project/.test(r.id));
  $("#heroFacts").innerHTML = `<div><b>2</b>environments: lab bench, and lab plus simulation</div><div><b>${fl.length}</b>failed Claude Opus 5.5 runs, replayed in full</div><div><b>${fl.reduce((a, r) => a + r.steps.length, 0).toLocaleString("en-US")}</b>steps with full hidden state</div>`;
}

async function main() {
  buildCompare(); buildDeliv();
  await load();
  buildClaims(); buildEnvs(); buildList(); miniStart();
  document.addEventListener("click", e => { const a = e.target.closest("[data-open]"); if (a) { e.preventDefault(); openRun(a.dataset.open, +a.dataset.step || 0); } });
  document.querySelectorAll(".seg button").forEach(b => b.onclick = () => heroPick(b.dataset.env));
  $("#heroPlay").onclick = () => { hero.playing = !hero.playing; const b = $("#heroPlay"); b.setAttribute("aria-pressed", hero.playing); b.querySelector("span").textContent = hero.playing ? "Pause" : "Play"; };
  { const b = $("#heroPlay"); b.setAttribute("aria-pressed", hero.playing); b.querySelector("span").textContent = hero.playing ? "Pause" : "Play"; }
  heroPick("wet"); heroLoop();
  const first = [...RUN_IDS.drywet, ...RUN_IDS.wet].find(id => isFailed(RUNS[id]));
  if (first) openRun(first, 0, false); else $("#runMain").innerHTML = `<p class="empty">Run data could not be loaded.</p>`;
  // start the replay the first time the player comes into view
  if (!REDUCED && "IntersectionObserver" in window) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); if (!ex.playing) startPlay(); } }, { threshold: 0.25 }); const pl = $("#runMain"); if (pl) io.observe(pl); }
}
main();
})();
