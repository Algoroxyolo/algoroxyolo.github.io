# Publication artwork

These assets illustrate the publications page. Research figures are taken from the corresponding papers; they do not add new results or claims to the academic data.

| File | Source | Region |
| --- | --- | --- |
| paper-2026-acl-long-520.png | https://aclanthology.org/2026.acl-long.520.pdf | Figure 1, page 4 |
| paper-2026-findings-acl-368.png | https://aclanthology.org/2026.findings-acl.368.pdf | Figure 2, page 3 |
| paper-2026-acl-demo-83.png | https://aclanthology.org/2026.acl-demo.83.pdf | Figure 1, page 2 |
| paper-culture.png | https://aclanthology.org/2026.findings-eacl.63.pdf | Figure 1, page 1 |
| paper-humanizing.png | https://aclanthology.org/2025.emnlp-main.164.pdf | Figure 1, page 3 |

Each PNG also contains its source and description in text metadata. Chameleon's card reuses the existing `projects/chameleon-limit/assets/figures/fig_combined.png` research figure. A paper without an available figure uses a text entry. The separate illustrated hero has been removed to restore the shared site style.

To add a verified research figure, save it as `paper-<stable-key>.png` using the same normalized name as its publication anchor, include source metadata, and rebuild with `scripts/build_academic.py`. Authors, publication status, venues, links, and findings continue to come from `data/academic.json`.
