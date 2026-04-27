/* =========================================================
   Main interactivity for The Chameleon's Limit website.
   ========================================================= */

(function () {
    'use strict';

    const D = window.SITE_DATA;

    /* --- Sidebar toggle (mobile) --- */
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
    // Close sidebar on link click (mobile)
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(a => {
        a.addEventListener('click', () => {
            if (window.innerWidth <= 820) sidebar.classList.remove('open');
        });
    });

    /* --- Sidebar active-section tracking via IntersectionObserver --- */
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const sectionIds = Array.from(navLinks).map(a => a.getAttribute('data-section'));
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const activateSection = (id) => {
        navLinks.forEach(a => a.classList.toggle('active',
            a.getAttribute('data-section') === id));
    };

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            let best = null;
            entries.forEach(e => {
                if (e.isIntersecting) {
                    if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
                }
            });
            if (best) activateSection(best.target.id);
        }, {
            rootMargin: '-20% 0px -60% 0px',
            threshold: [0, 0.1, 0.25, 0.5, 0.75]
        });
        sections.forEach(s => io.observe(s));
    }

    /* --- Render persona dimension chips --- */
    const dimChipsEl = document.getElementById('dim-chips');
    if (dimChipsEl && D.personaDimensions) {
        dimChipsEl.innerHTML = D.personaDimensions.map(d => {
            return `<span class="chip">${d.name}</span>`;
        }).join('');
    }

    /* --- Render model tags --- */
    const modelTagsEl = document.getElementById('model-tags');
    if (modelTagsEl && D.models) {
        modelTagsEl.innerHTML = D.models.map(m =>
            `<span class="model-tag ${m.track === 'role-play' ? 'role-play' : ''}" title="${m.track}">${m.name}</span>`
        ).join('');
    }

    /* --- Behavioral Trait Matrix: concrete 3×5 example --- */
    const btmVisual = document.getElementById('btm-visual');
    if (btmVisual) {
        const personas = [
            {
                short: 'Persona 1',
                tag: '30 · Male · Left-lib · US',
                detail: 'Big-5 Openness: High · Christian · Middle class'
            },
            {
                short: 'Persona 2',
                tag: '60 · Female · Right-con · India',
                detail: 'Big-5 Conscientious: High · Hindu · Upper class'
            },
            {
                short: 'Persona 3',
                tag: '22 · Non-binary · Left-lib · France',
                detail: 'Big-5 Neuroticism: High · Atheist · Lower class'
            }
        ];
        // 5 items — mix of the 3 instruments, Likert 1–5
        const items = [
            { inst: 'BFI', label: '"Is talkative"' },
            { inst: 'BFI', label: '"Worries a lot"' },
            { inst: 'Moral', label: 'Gun control scenario' },
            { inst: 'Moral', label: 'Abortion scenario' },
            { inst: 'Self-intro', label: 'Open-ended 50-word bio' }
        ];
        // Illustrative values (colors will map: 1=red, 3=neutral, 5=teal; text cell for self-intro)
        const rows = [
            [4, 2, 1, 1, '"I enjoy quiet evenings…"'],
            [3, 4, 4, 5, '"Raised in a devout Hindu…"'],
            [5, 5, 2, 2, '"They/them. Climate-anxious."']
        ];

        const cellColor = (v) => {
            if (typeof v === 'string') return null;
            // 1 → coral, 3 → warm neutral, 5 → teal
            const palette = {
                1: { bg: '#f0b8a8', fg: '#7a2a17' },
                2: { bg: '#f4d4c2', fg: '#8a4026' },
                3: { bg: '#f0e4c8', fg: '#7c6a2f' },
                4: { bg: '#c9deca', fg: '#2e5a4a' },
                5: { bg: '#a0cbb9', fg: '#15433a' }
            };
            return palette[v] || palette[3];
        };

        // Build column headers
        const colHeadsHTML = items.map(it => `
            <div class="btm2-col-head">
                <div class="btm2-col-inst">${it.inst}</div>
                <div class="btm2-col-label">${it.label}</div>
            </div>
        `).join('');

        // Build body rows
        const rowsHTML = personas.map((p, r) => {
            const cellsHTML = items.map((it, c) => {
                const v = rows[r][c];
                if (typeof v === 'string') {
                    return `<div class="btm2-cell btm2-cell-text" title="${v}">${v}</div>`;
                }
                const col = cellColor(v);
                return `<div class="btm2-cell btm2-cell-num" style="background:${col.bg};color:${col.fg};" title="Likert ${v}/5">${v}</div>`;
            }).join('');
            return `
                <div class="btm2-row">
                    <div class="btm2-row-head">
                        <div class="btm2-row-short">${p.short}</div>
                        <div class="btm2-row-tag">${p.tag}</div>
                        <div class="btm2-row-detail">${p.detail}</div>
                    </div>
                    ${cellsHTML}
                </div>
            `;
        }).join('');

        btmVisual.innerHTML = `
            <div class="btm2-header">
                <div class="btm2-header-name">Behavioral Trait Matrix</div>
                <div class="btm2-header-eq">
                    <span class="eq">B &isin; &#8477;<sup>N &times; D</sup></span>
                    &nbsp; example: 3 personas &times; 5 items
                </div>
            </div>
            <div class="btm2-grid">
                <div class="btm2-corner">
                    <span class="btm2-corner-y">N personas ↓</span>
                    <span class="btm2-corner-x">D items →</span>
                </div>
                ${colHeadsHTML}
                ${rowsHTML}
            </div>
            <div class="btm2-legend">
                <span>Each cell = one persona's response to one item.</span>
                <span class="btm2-legend-scale">
                    <span class="btm2-swatch" style="background:#f0b8a8"></span>1
                    <span class="btm2-swatch" style="background:#f4d4c2"></span>2
                    <span class="btm2-swatch" style="background:#f0e4c8"></span>3
                    <span class="btm2-swatch" style="background:#c9deca"></span>4
                    <span class="btm2-swatch" style="background:#a0cbb9"></span>5
                </span>
                <span>Scale up to <span class="mono">N = 1,144</span> personas and <span class="mono">D ≈ 200</span> items.</span>
            </div>
        `;
    }

    /* --- Truncation pyramid SVG --- */
    const pyramidSvg = document.getElementById('pyramid-svg');
    if (pyramidSvg && D.truncationHierarchy) {
        const W = 860, H = 520;
        const layers = D.truncationHierarchy;
        // Trapezoid layers — wider at top (higher mention rate), narrower at bottom (lower rate).
        const topY = 40, bottomY = H - 60;
        const layerH = (bottomY - topY) / layers.length;
        const centerX = W / 2;
        const maxHalfW = 360;

        let svgHtml = '';
        // background grid lines
        for (let r = 0; r <= 1.0; r += 0.2) {
            const gy = topY + (1 - r) * (bottomY - topY);
            svgHtml += `<line x1="40" x2="${W - 40}" y1="${gy}" y2="${gy}" stroke="#e8e0d1" stroke-width="1" stroke-dasharray="3 4"/>`;
            svgHtml += `<text x="${W - 30}" y="${gy + 4}" font-family="JetBrains Mono, monospace" font-size="11" fill="#8a9693">${Math.round(r * 100)}%</text>`;
        }

        layers.forEach((layer, i) => {
            const y0 = topY + i * layerH;
            const y1 = y0 + layerH - 4;
            const halfW0 = (layer.rate) * maxHalfW;
            // Slight taper to next layer
            const nextRate = (i < layers.length - 1) ? layers[i + 1].rate : layer.rate * 0.92;
            const halfW1 = nextRate * maxHalfW;
            const x0L = centerX - halfW0, x0R = centerX + halfW0;
            const x1L = centerX - halfW1, x1R = centerX + halfW1;
            const pathData = `M${x0L},${y0} L${x0R},${y0} L${x1R},${y1} L${x1L},${y1} Z`;
            svgHtml += `<path d="${pathData}" fill="${layer.color}" fill-opacity="0.88" stroke="#fff" stroke-width="2" class="pyramid-layer" data-i="${i}">
                <title>${layer.attr}: ${(layer.rate * 100).toFixed(0)}% mention rate</title>
            </path>`;
            // Center label
            svgHtml += `<text x="${centerX}" y="${y0 + layerH / 2 + 2}" text-anchor="middle" font-family="Fraunces, serif" font-size="20" font-weight="700" fill="#fff">${layer.attr}</text>`;
            svgHtml += `<text x="${centerX}" y="${y0 + layerH / 2 + 22}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="600" fill="#fff" fill-opacity="0.85">${(layer.rate * 100).toFixed(0)}% mention rate</text>`;
            // Annotation on right
            svgHtml += `<text x="${W - 70}" y="${y0 + layerH / 2 + 4}" text-anchor="end" font-family="Inter, sans-serif" font-size="12" fill="#6b7b78" font-style="italic">${layer.note}</text>`;
        });

        // Arrow on the left indicating "compressed out"
        svgHtml += `
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#d8553b"/>
            </marker>
          </defs>
          <line x1="34" y1="${topY + 10}" x2="34" y2="${bottomY - 10}" stroke="#d8553b" stroke-width="2.2" marker-end="url(#arrow)"/>
          <text x="18" y="${(topY + bottomY) / 2}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#d8553b" transform="rotate(-90, 18, ${(topY + bottomY) / 2})" letter-spacing="0.1em">COMPRESSED OUT</text>
          <text x="${W - 40}" y="${topY - 16}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="11" fill="#6b7b78">mention rate →</text>
        `;

        pyramidSvg.innerHTML = svgHtml;
    }

    /* --- Pipeline (Qwen3-32B → CoSER-Qwen-32B → HER-32B) --- */
    const pipelineEl = document.getElementById('pipeline-grid');
    if (pipelineEl && D.pipeline) {
        pipelineEl.innerHTML = D.pipeline.map((stage, idx) => `
            <div class="pipeline-stage">
                <div class="pipeline-node">${idx + 1}</div>
                <div class="pipeline-stage-name">${stage.name}</div>
                <div class="pipeline-stage-sub">${stage.subtitle}</div>
                <div class="pipeline-metrics">
                    ${stage.metrics.map(m => `
                        <div class="pipeline-metric">
                            <span class="pipeline-metric-key">${m.k}</span>
                            <span class="pipeline-metric-val">${m.v}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    /* --- Reversal flip (personality ↔ moral ranks) --- */
    const reversalEl = document.getElementById('reversal-flip');
    if (reversalEl && D.reversal) {
        const personalityItems = D.reversal.map(r => `
            <div class="reversal-item rank-${r.personality.rank}">
                <span>${r.model}</span>
                <span class="mono" style="color: var(--ink-mute);">${r.personality.label}</span>
            </div>
        `).join('');
        const moralItems = D.reversal.map(r => `
            <div class="reversal-item rank-${r.moral.rank}">
                <span>${r.model}</span>
                <span class="mono" style="color: var(--ink-mute);">${r.moral.label}</span>
            </div>
        `).join('');
        reversalEl.innerHTML = `
            <div class="reversal-col">
                <div class="reversal-col-head">BFI · Personality</div>
                ${personalityItems}
            </div>
            <div class="reversal-arrows">⇄</div>
            <div class="reversal-col">
                <div class="reversal-col-head">Moral Reasoning</div>
                ${moralItems}
            </div>
        `;
    }

    /* --- Scenarios grid --- */
    const scenariosGrid = document.getElementById('scenarios-grid');
    if (scenariosGrid && D.scenarios) {
        scenariosGrid.innerHTML = D.scenarios.map(sc => `
            <div class="scenario-card" data-scenario-id="${sc.id}">
                <div class="scenario-card-top">
                    <span class="scenario-id">#${sc.id}</span>
                    <span class="scenario-tag">${sc.tag}</span>
                </div>
                <h4 class="scenario-title">${sc.title}</h4>
                <p class="scenario-summary">${sc.summary}</p>
                <div class="cta">Show model responses →</div>
            </div>
        `).join('');
    }

    /* --- Case-study dynamic area --- */
    const caseDyn = document.getElementById('case-study-dynamic');
    let CASE_STUDIES = null;  // { scenarios: [...] }
    let activeScenarioId = null;
    let activeModelName = null;

    const ratingLabels = {
        1: 'Strongly favor A',
        2: 'Somewhat favor A',
        3: 'Neutral / undecided',
        4: 'Somewhat favor B',
        5: 'Strongly favor B'
    };

    // Pick the "most collapsed" model for a scenario
    // = the model whose dominant-rating share is the largest percentage of its population.
    const pickMostCollapsedModel = (scenarioBlock) => {
        if (!scenarioBlock || !scenarioBlock.models) return null;
        let best = null;
        let bestPct = -1;
        scenarioBlock.models.forEach(m => {
            if (!m.counts) return;
            const total = Object.values(m.counts).reduce((a, b) => a + b, 0);
            if (!total) return;
            const dominant = m.collapse_rating;
            const n = m.counts[String(dominant)] || m.counts[dominant] || 0;
            const pct = (n / total) * 100;
            if (pct > bestPct) { bestPct = pct; best = m; }
        });
        return best;
    };

    // Map scenario.id (number) in SITE_DATA -> scenario block in JSON
    const findScenarioBlock = (scenarioNumId) => {
        if (!CASE_STUDIES || !CASE_STUDIES.scenarios) return null;
        const key = `scenario_${scenarioNumId}`;
        return CASE_STUDIES.scenarios.find(s => s.id === key) || null;
    };

    const attrsFromObj = (obj, limit = 6) => {
        if (!obj) return [];
        return Object.entries(obj).slice(0, limit).map(([k, v]) => ({ k, v }));
    };

    const renderCaseStudy = (scenarioId, modelName = null) => {
        if (!caseDyn) return;
        const sc = D.scenarios.find(x => x.id === scenarioId);
        if (!sc) return;
        activeScenarioId = scenarioId;

        // Highlight active card
        document.querySelectorAll('.scenario-card').forEach(c =>
            c.classList.toggle('active', Number(c.dataset.scenarioId) === scenarioId));

        const block = findScenarioBlock(scenarioId);
        if (!block) {
            caseDyn.innerHTML = `
                <div class="case-head">
                    <div class="case-scenario-meta">
                        <div class="case-scenario-id">SCENARIO #${sc.id} · ${sc.tag.toUpperCase()}</div>
                        <h3 class="case-scenario-title">${sc.title}</h3>
                        <p class="case-scenario-body">${sc.summary}</p>
                    </div>
                </div>
                <p class="case-note">No curated model data was loaded for this scenario.</p>
            `;
            return;
        }

        // Select model: user-requested > default to most collapsed
        let modelEntry = null;
        if (modelName) modelEntry = block.models.find(m => m.model === modelName);
        if (!modelEntry) modelEntry = pickMostCollapsedModel(block);
        if (!modelEntry) {
            caseDyn.innerHTML = `<p class="case-note">No model data available.</p>`;
            return;
        }
        activeModelName = modelEntry.model;

        const counts = modelEntry.counts || {};
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        const dominant = modelEntry.collapse_rating;
        const dominantCount = counts[String(dominant)] || counts[dominant] || 0;
        const dominantPct = (dominantCount / total) * 100;

        // Conservative-vs-liberal pool breakdown
        const conPool = modelEntry.conservative_pool_counts || {};
        const libPool = modelEntry.liberal_pool_counts || {};
        const conTotal = modelEntry.conservative_pool_size || Object.values(conPool).reduce((a, b) => a + b, 0);
        const libTotal = modelEntry.liberal_pool_size || Object.values(libPool).reduce((a, b) => a + b, 0);
        const conDom = (conPool[String(dominant)] || conPool[dominant] || 0);
        const libDom = (libPool[String(dominant)] || libPool[dominant] || 0);
        const conDomPct = conTotal ? (conDom / conTotal) * 100 : 0;
        const libDomPct = libTotal ? (libDom / libTotal) * 100 : 0;

        // Example pair attrs
        const pairA = (modelEntry.example_pair && modelEntry.example_pair.persona_A) || {};
        const pairB = (modelEntry.example_pair && modelEntry.example_pair.persona_B) || {};
        const attrsA = attrsFromObj(pairA.attributes, 7);
        const attrsB = attrsFromObj(pairB.attributes, 7);

        const persAttrsHTML = (attrs) => attrs.map(a =>
            `<div class="persona-attr"><span class="persona-attr-key">${a.k}</span><span class="persona-attr-val">${a.v}</span></div>`
        ).join('');

        // Bar segments
        const barSegs = [1, 2, 3, 4, 5].map(r => {
            const n = counts[String(r)] || counts[r] || 0;
            const pct = (n / total) * 100;
            if (pct <= 0) return '';
            const isDom = (r === dominant);
            return `<div class="dist-seg dist-seg-${r}${isDom ? ' dist-seg-dominant' : ''}" style="width:${pct}%" title="Rating ${r} (${ratingLabels[r]}): ${n} personas (${pct.toFixed(1)}%)">${pct > 6 ? pct.toFixed(0) + '%' : ''}</div>`;
        }).join('');

        // Other models for this scenario — clickable switcher
        const otherModelsHTML = block.models.map(m => {
            const t = Object.values(m.counts).reduce((a, b) => a + b, 0) || 1;
            const dn = m.counts[String(m.collapse_rating)] || m.counts[m.collapse_rating] || 0;
            const pct = ((dn / t) * 100).toFixed(0);
            return `<button class="model-tag model-tag-btn ${m.model === modelEntry.model ? 'active' : ''}" data-model-switch="${m.model}">
                ${m.model} · rated ${m.collapse_rating} by ${pct}%
            </button>`;
        }).join('');

        caseDyn.innerHTML = `
            <div class="case-head">
                <div class="case-scenario-meta">
                    <div class="case-scenario-id">SCENARIO #${sc.id} · ${sc.tag.toUpperCase()}</div>
                    <h3 class="case-scenario-title">${block.title || sc.title}</h3>
                    <p class="case-scenario-body">${block.summary || sc.summary}</p>
                    <p class="case-scenario-body" style="margin-top:8px;">
                        <strong>A:</strong> ${block.A || 'The author is wrong'}
                        &nbsp;·&nbsp;
                        <strong>B:</strong> ${block.B || 'Others are wrong'}
                    </p>
                </div>
                <div class="case-model-chip">
                    <span class="case-model-chip-label">Showing model</span>
                    <span class="case-model-chip-name">${modelEntry.model}</span>
                </div>
            </div>

            <div class="vs-grid">
                <div class="persona-col persona-a">
                    <div class="persona-header">
                        <span class="persona-label">Persona A</span>
                        <span class="muted-tiny">${pairA.paraphrase || ''}</span>
                    </div>
                    <div class="persona-attrs">${persAttrsHTML(attrsA)}</div>
                </div>
                <div class="vs-center">
                    <div class="vs-line"></div>
                    <div class="vs-circle">VS</div>
                    <div class="vs-line"></div>
                </div>
                <div class="persona-col persona-b">
                    <div class="persona-header">
                        <span class="persona-label">Persona B</span>
                        <span class="muted-tiny">${pairB.paraphrase || ''}</span>
                    </div>
                    <div class="persona-attrs">${persAttrsHTML(attrsB)}</div>
                </div>
            </div>

            <div class="case-verdict">
                <div class="case-verdict-rating">
                    <span class="rating-num">${dominant}</span>
                    <span>${ratingLabels[dominant] || '—'}</span>
                </div>
                <div class="case-verdict-text">
                    <strong>Both personas converge on the same rating (${dominant}).</strong>
                    Despite opposite political orientation, religion, nationality, and age,
                    <span class="mono">${modelEntry.model}</span> lands them on
                    <em>${ratingLabels[dominant]}</em>.
                </div>
            </div>

            <div class="case-collapse-stats">
                <div class="stat-label">Full population<br>(${total} personas)</div>
                <div class="dist-bar">${barSegs}</div>

                <div class="stat-label" style="color: var(--teal-deep);">Most-conservative pool<br>(${conTotal} personas)</div>
                <div class="pool-row">
                    <div class="pool-bar"><div class="pool-fill pool-con" style="width:${conDomPct}%"></div></div>
                    <div class="pool-stat"><strong>${conDomPct.toFixed(0)}%</strong> rated ${dominant}</div>
                </div>

                <div class="stat-label" style="color: var(--coral);">Most-liberal pool<br>(${libTotal} personas)</div>
                <div class="pool-row">
                    <div class="pool-bar"><div class="pool-fill pool-lib" style="width:${libDomPct}%"></div></div>
                    <div class="pool-stat"><strong>${libDomPct.toFixed(0)}%</strong> rated ${dominant}</div>
                </div>
            </div>

            <div class="case-collapse-punchline">
                <div class="punchline-equation">
                    <div class="eq-side eq-con">
                        <div class="eq-pct">${conDomPct.toFixed(0)}%</div>
                        <div class="eq-label">most-conservative</div>
                    </div>
                    <div class="eq-op">≈</div>
                    <div class="eq-side eq-lib">
                        <div class="eq-pct">${libDomPct.toFixed(0)}%</div>
                        <div class="eq-label">most-liberal</div>
                    </div>
                </div>
                <div class="punchline-text">
                    On a scenario where <strong>humans divide sharply</strong> along political lines,
                    <span class="mono">${modelEntry.model}</span> gives
                    <strong>essentially the same verdict</strong> to both extremes
                    &mdash; a gap of just <strong>${Math.abs(conDomPct - libDomPct).toFixed(0)}&nbsp;pp</strong>.
                    The model has erased the disagreement.
                </div>
            </div>

            <div class="model-switcher">
                <div class="stat-label">Compare another model on this scenario:</div>
                <div class="model-switcher-row">${otherModelsHTML}</div>
            </div>
        `;
    };

    // Attach scenario-card click handlers (delegated)
    if (scenariosGrid) {
        scenariosGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.scenario-card');
            if (!card) return;
            const id = Number(card.dataset.scenarioId);
            renderCaseStudy(id);
            caseDyn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }
    // Delegated model-switcher
    if (caseDyn) {
        caseDyn.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-model-switch]');
            if (!btn) return;
            renderCaseStudy(activeScenarioId, btn.dataset.modelSwitch);
        });
    }

    // Attempt to load curated case studies JSON
    fetch('assets/case_studies.json', { cache: 'no-cache' })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
            if (!json) {
                if (D.scenarios.length) renderCaseStudy(D.scenarios[0].id);
                return;
            }
            CASE_STUDIES = json;
            // Default to the MOST dramatic scenario: highest max dominant-rating share
            let bestId = D.scenarios[0].id;
            let bestPct = -1;
            for (const s of D.scenarios) {
                const blk = findScenarioBlock(s.id);
                if (!blk) continue;
                const m = pickMostCollapsedModel(blk);
                if (!m) continue;
                const total = Object.values(m.counts).reduce((a, b) => a + b, 0);
                const dom = m.counts[String(m.collapse_rating)] || 0;
                const pct = (dom / total) * 100;
                if (pct > bestPct) { bestPct = pct; bestId = s.id; }
            }
            renderCaseStudy(bestId);
        })
        .catch(() => {
            if (D.scenarios.length) renderCaseStudy(D.scenarios[0].id);
        });

    /* --- References modal --- */
    const refModal = document.getElementById('ref-modal');
    const refTitle = document.getElementById('ref-modal-title');
    const refAuthors = document.getElementById('ref-modal-authors');
    const refVenue = document.getElementById('ref-modal-venue');
    const refActions = document.getElementById('ref-modal-actions');
    const refKicker = document.getElementById('ref-modal-kicker');

    // Build refs lookup by key + position-based numbering
    const refByKey = {};
    D.references.forEach((r, i) => { refByKey[r.key] = { ...r, num: i + 1 }; });

    // Populate inline [?] markers with their numbers
    document.querySelectorAll('.ref[data-ref]').forEach(span => {
        const key = span.dataset.ref;
        const entry = refByKey[key];
        if (entry) {
            span.textContent = `[${entry.num}]`;
            span.setAttribute('title', `${entry.authors} — ${entry.title}`);
        } else {
            span.textContent = `[?]`;
        }
    });

    // Render full references list
    const refsListEl = document.getElementById('refs-list');
    if (refsListEl) {
        refsListEl.innerHTML = D.references.map((r, i) => `
            <div class="ref-item" data-ref-key="${r.key}">
                <span class="ref-item-num">[${i + 1}]</span>
                <div class="ref-item-body"><strong>${r.title}</strong><br>${r.authors}. <em>${r.venue}</em>.</div>
                <span class="ref-item-year">${r.year || ''}</span>
            </div>
        `).join('');
    }

    const openRefModal = (key) => {
        const entry = refByKey[key];
        if (!entry) return;
        refKicker.textContent = `Reference [${entry.num}]`;
        refTitle.textContent = entry.title;
        refAuthors.textContent = entry.authors;
        refVenue.textContent = entry.venue;
        refActions.innerHTML = '';
        if (entry.url) {
            refActions.innerHTML = `<a href="${entry.url}" target="_blank" rel="noopener">Open link ↗</a>`;
        }
        refModal.classList.add('open');
        refModal.setAttribute('aria-hidden', 'false');
    };

    const closeRefModal = () => {
        refModal.classList.remove('open');
        refModal.setAttribute('aria-hidden', 'true');
    };

    // Delegated clicks on any inline [n] ref
    document.addEventListener('click', (e) => {
        const inline = e.target.closest('.ref[data-ref]');
        if (inline) {
            e.preventDefault();
            openRefModal(inline.dataset.ref);
            return;
        }
        const item = e.target.closest('.ref-item[data-ref-key]');
        if (item) {
            openRefModal(item.dataset.refKey);
            return;
        }
        if (e.target.hasAttribute('data-close-modal')) closeRefModal();
    });

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && refModal.classList.contains('open')) closeRefModal();
    });

    /* --- Copy button --- */
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const target = document.querySelector(btn.dataset.copyTarget);
            if (!target) return;
            try {
                await navigator.clipboard.writeText(target.textContent);
                const prev = btn.textContent;
                btn.textContent = '✓ Copied';
                btn.classList.add('copied');
                setTimeout(() => { btn.textContent = prev; btn.classList.remove('copied'); }, 1800);
            } catch (e) {
                btn.textContent = 'Copy failed';
            }
        });
    });


})();
