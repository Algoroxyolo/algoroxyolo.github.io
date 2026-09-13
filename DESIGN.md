---
name: Yunze Xiao academic website
description: A research poster with open columns, paper figures, and complete scholarly evidence.
colors:
  accent-light: "#B509AC"
  accent-dark: "#2698BA"
  background-light: "#ffffff"
  background-dark: "#1C1C1D"
  text-light: "#252326"
  text-dark: "#e8e8e8"
  muted-light: "#68616a"
  muted-dark: "#b8b2ba"
  rule-light: "#e2dfe3"
  rule-dark: "#49434c"
  card-light: "#ffffff"
  card-dark: "#1C1C1D"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.2rem, 4vw, 3.25rem)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.85rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-.02em"
  poster-name:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.6rem, 4.1vw, 3.65rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-.035em"
  poster-lead:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.45rem, 2.2vw, 1.85rem)"
    lineHeight: 1.4
    letterSpacing: "-.015em"
  poster-heading:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.55rem"
    lineHeight: 1.2
    letterSpacing: "-.015em"
  poster-paper-title:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "1.06rem"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  reading:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: ".95rem"
    fontWeight: 600
  authors:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: ".95rem"
    lineHeight: 1.6
  caption:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: ".875rem"
    lineHeight: 1.5
rounded:
  control: "4px"
  calendar: "4px"
  chip: "999px"
  portrait: "50%"
spacing:
  compact: ".5rem"
  related: "1rem"
  group: "1.5rem"
  columns: "2rem"
  section: "2.5rem"
  major-section: "3.5rem"
  poster-gutter: "1.65rem"
  masthead-gap: "3rem"
components:
  preset:
    backgroundColor: "transparent"
    textColor: "{colors.text-light}"
    rounded: "{rounded.control}"
    padding: ".6rem .85rem"
  preset-selected:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.background-light}"
    rounded: "{rounded.control}"
    padding: ".6rem .85rem"
  preset-selected-dark:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.background-dark}"
    rounded: "{rounded.control}"
    padding: ".6rem .85rem"
  text-button:
    backgroundColor: "transparent"
    textColor: "{colors.accent-light}"
    padding: ".5rem 0"
  field:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.control}"
    padding: ".6rem"
    width: "100%"
  publication-row:
    padding: "1.75rem 0"
  calendar:
    backgroundColor: "{colors.card-light}"
    rounded: "{rounded.calendar}"
  theme-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.text-light}"
    rounded: "{rounded.control}"
    padding: ".35rem .65rem"
  topic-chip:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.chip}"
    padding: ".3rem .6rem"
  topic-chip-selected:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.background-light}"
    rounded: "{rounded.chip}"
    padding: ".3rem .6rem"
  poster-publication:
    padding: "1.25rem 0"
---

# Design System: Yunze Xiao academic website

## Overview

**Creative North Star: "Research poster"**

The research poster uses a wide reading surface, a strong masthead rule, open research columns, and figures from the papers. Fraunces gives names and research questions their hierarchy; Source Sans 3 carries complete scholarly metadata and prose.

The shared shell has static text navigation and a persistent light/dark theme switch. Research, bibliography, writing, and study pages use the same typography, colors, rules, and figure treatment with widths suited to their content. The approved direction is A, research poster; the proposed novel interactions were rejected.

Authority: the active templates, the final cascade in assets/css/academic.css and assets/css/publications.css, assets/js/site.js, assets/js/research.js, and scripts/research_site.py. The approved surface contract is .impeccable/surfaces/index-html.md.

**Key Characteristics:**

- Open columns, thin dividers, and a strong masthead rule.
- Fraunces headings, Source Sans 3 text, and the retained circular portrait.
- Existing research figures with captions, paper links, and full-size access.

## Colors

Magenta identifies links and selected controls on white; cyan takes the same role on charcoal. Neutral text and divider colors follow the theme.

### Primary

- **Light accent / dark accent:** links, selected topic chips and experiment presets, focus outlines, and the retained illustration's marks.

**The Theme Pair Rule.** Resolve interactive colors through the existing light and dark theme variables.

### Neutral

- **Background / text:** the continuous page surface and primary reading text.
- **Muted / rule:** authors, venues, captions, and separators.
- **Card:** the calendar shares the page background in both themes.
- **Paper white:** paper figures retain their original white background in both themes.

Frontmatter primitives are normative. Component defaults describe light mode; runtime custom properties supply both themes.

## Typography

**Display Font:** Fraunces with Georgia and serif fallbacks.
**Body Font:** Source Sans 3 with a sans-serif fallback.

Names and questions use the serif's larger forms. Dense publication evidence uses sans serif type, complete author lists, and wrapping links.

### Hierarchy

- **Display:** shared page titles. The publication archive uses a compact title (2.5rem).
- **Poster name / lead / heading:** identity, research overview, and the three research headings. The name has a short measure (11ch) on desktop.
- **Headline:** shared section headings; the Home selected-publications heading is compact (1.4rem).
- **Title / poster paper title:** publication titles in reading pages and narrower poster columns.
- **Body / reading:** body text and denser academic content, with a paragraph maximum measure (75ch).
- **Authors / caption:** complete supporting text. Poster authors use a smaller size on desktop (.85rem), restoring the reading size on mobile (.95rem). Paper-figure captions use a compact size (.8rem) and line height (1.45).

**The Reading Hierarchy Rule.** Use serif type for names and research headings; use sans serif type for publication titles, metadata, and controls.

## Layout

The shared centered container has a maximum width (1200px) and side padding (30px). Navigation stays in document flow with a desktop minimum height (76px). Main content starts below it with top padding (2rem). Reading pages narrow the main container to 920px; study pages use 1040px.

Home pairs identity and the complete research overview in two masthead columns (1fr / 1.45fr) with a gap (3rem) and a strong bottom rule (2px). The portrait is 86px square. Three equal research columns follow, with interior side padding (1.65rem), thin vertical dividers, and no outer containers. Each column contains a heading, question, figure, and selected papers. Figure viewports have a fixed desktop height (175px) and contain the complete image. Background and recent news form two columns lower on Home; contact and calendar use the same two-column grammar.

At 1000px and below, masthead proportions become 1fr / 1.3fr with a 2rem gap; poster gutters narrow to 1rem. At 767px and below, side padding becomes 22px, the navigation links occupy a second visible row, and the masthead, poster, background, contact, research themes, and study index stack. Horizontal rules replace poster column dividers. The portrait becomes 70px; the name becomes 2.6rem. Research headings become 1.75rem and discard their desktop minimum height. Figures use their natural height up to 260px. Semantic reading order stays unchanged.

Research themes pair a question and figure with the supporting findings in columns (1fr / 1.4fr), with a 3rem gap. Study figures contain the full image within a 900px width and 620px image-height limit. Writing entries pair a 100px date column with article text and stack on mobile.

### Publications layout

Publications uses the shared 1200px shell. A sticky year rail is 125px wide, with a 28px gap and a top offset of 1rem. At 767px and below, the rail becomes a static, horizontally scrollable row, and paper figures stack below text. The archive uses continuous ruled entries. Search, status, and clear actions share a desktop row; at 575px and below, search spans the row above status and clear. Topics are visible on desktop and use a native disclosure on mobile.

### Capture and figure evidence

The final poster capture set is .impeccable/review/poster/*.png. It records Home in desktop, mobile, and dark mode; scrolled selected papers; Publications in desktop and mobile light/dark; Research, a study, and Writing. The documenter directly inspected home-desktop.png, home-mobile.png, publications-mobile-dark.png, and research-desktop.png. Captures are viewport evidence; source inspection establishes responsive rules and offscreen behavior. The final topics-mobile-focused.png records visible focus after a paper-tag action; the desktop Publications capture was refreshed after a responsive transition.

This build reuses existing raster assets. Publication-figure provenance is recorded in assets/img/publications/README.md and the PNG text metadata. Home uses paper-humanizing.png, paper-2026-acl-demo-83.png, and the existing projects/chameleon-limit/assets/figures/fig_combined.png. The Chameleon figure comes from the existing research microsite. The retained portrait is assets/img/Yunze Xiao.jpg. No raster was generated or replaced in this build.

## Elevation & Depth

The academic surfaces are flat. Spacing and one-pixel rules separate content; two-pixel rules establish the masthead and major Home divisions. There are no authored shadows in the shared shell. Paper figures retain white backing so their original labels and colors remain readable in dark mode.

**The Open Surface Rule.** Separate research and publication groups with spacing and thin rules.

## Shapes

The portrait is circular. Fields, theme controls, experiment presets, and the calendar use small rounded corners. Topic chips are pills. Paper figures preserve their rectangular bounds and original aspect ratios. The retained illustration uses functional circles, connectors, and axes.

## Components

### Navigation and theme control

Static text navigation shows the active page in accent with an underline. Links and the theme button have a minimum target height (44px). Mobile exposes all navigation links in a second row. The theme button names the destination theme, switches the page colors, and stores the selection locally. The skip link appears on keyboard focus.

### Buttons, chips, and fields

Text actions use an underline, transparent background, and minimum height (44px). Topic chips use a ruled outline and minimum height (40px); selected chips use an accent fill, contrasting theme background text, and heavier weight. Their aria-pressed state exposes selection. Search and native selects have a muted border, full available width, and minimum height (44px). Placeholders use the muted foreground at full opacity.

Links, buttons, and disclosures use an accent focus outline (2px) with a 4px offset. Fields and chips use a 3px offset. The theme button and topic-chip borders take the accent on hover; ordinary content links underline on hover.

### Publication entries and disclosures

Publication entries show title, full authors, venue, takeaway, and wrapping resource links. Native abstract and BibTeX disclosures retain their markers; BibTeX text wraps within the available width. Citation copying supplies live feedback and a selectable textarea fallback. Google Scholar is the citation-count source, with its retrieval date shown beside the count.

Filters expose the visible paper count and an actionable empty state. Search, topic, and status follow the URL and browser history. A paper anchor reveals a filtered-out entry. Topic disclosure state updates when the viewport crosses 768px; following a paper tag opens the disclosure before focusing the selected chip.

### Research figures and poster columns

A linked, uncropped paper figure sits between each research question and its papers. Its caption names the study, links to the paper, and offers the full-size image. Research columns remain open on the shared page background. Their figure, scholarly text, and links form one reading sequence.

### Calendar and retained illustration

The calendar is an embedded scheduling surface within a thin border and a small radius. The existing Chameleon illustration remains at its study-page anchor. Two native ranges and three presets update 24 deterministic synthetic people, with a readable conclusion, assumptions disclosure, reset, and research links. Controls enhance static content and persist their settings in the URL. No new interaction concept was introduced by the poster build.

The shared shell has no authored decorative motion. The reduced-motion rule removes transitions and animations and restores automatic scrolling. Print hides navigation, the calendar, and enhancement controls and retains the poster columns.

## Do's and Don'ts

### Do:

- Do retain the established fonts, portrait, and light/dark theme pairing.
- Do preserve full author lists and wrap scholarly metadata within the available column.
- Do use visible keyboard focus, native controls, and readable content without JavaScript.
- Do keep paper figures uncropped on white with captions and full-size links.

### Don't:

- Don't introduce container cards, decorative animation, or novel interactions into the approved poster direction.
- Don't present synthetic illustration values as paper measurements or a live model.
- Don't copy obsolete fixed navigation, collapsed mobile menus, or the superseded 880px shell into new academic surfaces.

Not canonized or repaired: unused legacy layout selectors in academic.css and inherited styles within separate project microsites. The active academic templates define the current shared shell; this documentation pass records that shell.
