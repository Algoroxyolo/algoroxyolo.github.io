# The Chameleon's Limit — Website

A single-page microsite that summarises the paper *"The Chameleon's Limit"*
and lets visitors explore per-scenario, per-model **persona collapse**
evidence interactively.

## Directory layout

```
website/
├── index.html                    # page structure
├── css/style.css                 # all styles
├── js/
│   ├── data.js                   # static content (models, refs, scenarios)
│   └── main.js                   # interactivity + dynamic case study
└── assets/
    ├── case_studies.json         # 6 scenarios × 5 models collapse data
    ├── figures/                  # figures from the paper (PNG, rendered from PDF)
    └── icons/                    # chameleon logo, GitHub mark
```

## Run locally

Any static-file server works. From this `website/` directory:

```bash
python -m http.server 8765
```

Then open <http://localhost:8765>. Serving over HTTP is required because
`js/main.js` uses `fetch()` to load `assets/case_studies.json`.

## Deploy to GitHub Pages (dedicated repo)

This folder is a self-contained static site. To publish:

1. Copy the **contents** of this directory into the root of a fresh
   GitHub repo (e.g. `persona-collapse-site`).
2. Push to `main`.
3. On the new repo: **Settings → Pages →
   Build and deployment → Source: "Deploy from a branch"**,
   choose `main` and `/ (root)`, save.
4. Within ~1 minute the site is live at
   `https://<owner>.github.io/<repo>/`.

Subsequent pushes to `main` auto-redeploy.

## Regenerating figures

All figures in `assets/figures/` were rendered from PDFs in
`../colm2026/Figures/`. If the paper's figures change, re-run:

```python
import pymupdf, shutil
from pathlib import Path

SRC = Path('../colm2026')
OUT = Path('assets/figures')

fig_map = {
    SRC / 'Figures' / 'fig_combined.pdf':            'fig_combined.png',
    SRC / 'Figures' / 'fig_pareto_coverage_lid.pdf': 'fig_pareto_coverage_lid.png',
    SRC / 'Figures' / 'fig_fidelity_caricature.pdf': 'fig_fidelity_caricature.png',
    SRC / 'Figures' / 'human_color.pdf':             'human_tsne.png',
    SRC / 'Figures' / 'model_color.pdf':             'model_tsne.png',
    SRC / 'Figures' / 'metrics' / 'coverage_3d_macaron.pdf':   'coverage_3d.png',
    SRC / 'Figures' / 'metrics' / 'uniformity_3d_macaron.pdf': 'uniformity_3d.png',
    SRC / 'Figures' / 'metrics' / 'complexity_3d_macaron.pdf': 'complexity_3d.png',
    SRC / 'Figures' / 'metrics' / 'hopkins_metric.pdf':        'hopkins_metric.png',
}
for pdf, out_name in fig_map.items():
    doc = pymupdf.open(str(pdf))
    pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(3, 3), alpha=True)
    pix.save(str(OUT / out_name))
```

## Case-study data (`assets/case_studies.json`)

This file drives the **"Collapse in Action"** section. Each scenario is
one of the six morally-charged items hand-picked by collaborators from
the moral-reasoning instrument. For every scenario we store, per model:

| Field | Meaning |
|------|---------|
| `counts` | Full persona-population rating distribution (keys 1–5). |
| `collapse_rating` | The dominant (modal) rating. |
| `conservative_pool_counts` / `conservative_pool_size` | Ratings among the most politically-conservative 100 personas. |
| `liberal_pool_counts` / `liberal_pool_size` | Ratings among the most politically-liberal 100 personas. |
| `example_pair` | Two maximally-opposed personas (high contrast score) that nevertheless produced the same rating. |

The front-end picks the model with the highest dominant-rating share and
displays its collapse pattern — conservative vs. liberal pool
percentages side by side, a full-population rating bar, and a visual
example of two opposing personas that got the same answer.

## Adding / changing scenarios

1. Generate a new `case_studies.json` entry (see `scripts/` in the main
   repo for how the numbers are computed).
2. Add a matching entry to `D.scenarios` in `js/data.js` — the `id`
   field must match (`"scenario_<id>"` in the JSON).
3. Reload. The card grid and the dynamic area are rendered from this
   pair of sources.
