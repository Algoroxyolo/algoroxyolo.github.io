---
name: Yunze Xiao academic website
description: Established academic reading with optional interactive experiments.
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
  card-dark: "#212529"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.2rem, 4vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.85rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-.02em"
  research-lead:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.65rem, 3vw, 2rem)"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-.02em"
  title:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: 'Source Sans 3, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  reading:
    fontFamily: 'Source Sans 3, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
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
  code:
    fontFamily: 'JetBrains Mono, "SFMono-Regular", Consolas, monospace'
rounded:
  control: "4px"
  calendar: "10px"
  portrait: "50%"
spacing:
  compact: ".5rem"
  related: "1rem"
  group: "1.5rem"
  columns: "2rem"
  section: "2.5rem"
  major-section: "3.5rem"
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
---

# Design System: Yunze Xiao academic website

## Overview

**Creative North Star: "Interactive experiments"**

The established academic website pairs expressive serif headings with quiet sans-serif reading text, a retained portrait, and light/dark themes. This is a record of the implemented system, not a new identity.

The homepage prioritizes directly visible academic information: full biography, substantive interests, recent news, and six representative publications. The user rejected an exploration-first homepage with reduced information density. Interactive experiments remain optional depth on study pages.

This phrase records the approved signature; it does not introduce a new branded metaphor. Authority is the actual cascade in `assets/css/main.css` then `assets/css/academic.css`, the templates, and `assets/js/research.js`, constrained by `PRODUCT.md` and `INTERACTION_BRIEF.md`. The tokens describe the shared academic surfaces, not every inherited blog or project-microsite style.

**Key Characteristics:**

- Fraunces headings and Source Sans 3 reading text.
- Theme-specific accent, generous section spacing, and thin rules.
- Optional experiments with native controls and explicit illustrative labeling.

## Colors

A magenta accent on white changes to cyan on charcoal in dark mode; reading text, secondary text, and separators follow the same theme switch.

### Primary

- **Light accent / dark accent:** links, active navigation, selected experiment presets, slider accents, filled plot marks, and focus outlines. Hover links retain the accent and gain an underline.
- **The Theme Pair Rule.** Resolve interactive color through the existing theme variables; the light and dark accents are a pair of alternatives, not two simultaneous brand accents.

### Neutral

- **Background:** the uninterrupted reading surface.
- **Text / muted:** primary prose versus authors, venues, explanatory labels, and captions.
- **Rule:** the shared academic separators.
- **Card:** the incumbent calendar surface; it is not the default container for research.

Frontmatter component defaults describe light mode unless named otherwise. Runtime components resolve colors through the global CSS variables; dark mode changes foregrounds as well as backgrounds.

## Typography

**Display Font:** Fraunces with Georgia/serif fallbacks.  
**Body Font:** Source Sans 3 with the incumbent platform fallbacks.  
**Label/Mono Font:** Source Sans 3 for controls; JetBrains Mono for code.

The serif supplies the academic voice; the sans serif handles dense information and interaction. There is an observed hierarchy, not a single mathematical scale.

### Hierarchy

- **Display:** page titles; balanced wrapping.
- **Headline:** shared section headings.
- **Research lead:** the more compact serif question on Home.
- **Title:** publication and content subheadings. Home question rows use a slightly larger size (1.3rem), reducing to the title size on phones.
- **Body / reading:** the body default and denser academic content. Paragraphs have a maximum measure (75ch), not a guaranteed minimum.
- **Label / authors / caption:** controls and supporting information retain sentence case and the sans-serif voice.

**The Reading Hierarchy Rule.** Use the serif for page and section headings; use the sans serif for publication titles, labels, and controls.

## Layout

A centered container has a maximum width (880px), with horizontal padding (24px); phone padding is narrower (22px). The fixed navigation has a divider and an anchor offset below it. Main content has a minimum height (`calc(100vh - 220px)`).

The Home introduction pairs full biography text with a portrait column (132px) and a gap (1.5rem). At widths up to 767px, the portrait column becomes 108px; at widths up to 575px, an 84px portrait floats beside the opening biography. Full research interests follow at reading width. Home uses compact section spacing (1.75rem) and publication padding (1rem). Larger section gaps remain on deeper reading pages.

Publication filters use three columns (1.3fr / 1fr / .7fr), then two with search spanning the row, then one. Experiment controls and plots use two equal columns and become one at the phone breakpoint. Actions wrap; navigation collapses below 768px. Publication entries remain a continuous ruled list with complete author text that can wrap anywhere.

Evidence inspected: `.impeccable/review/desktop.png`, `publications-mobile.png`, `experiment-desktop.png`, and `experiment-mobile-dark.png`. These are viewport captures, including scrolled experiment views, not full-page captures; they corroborate only the visible compositions. Source inspection supplies behavior and offscreen layout details.

### Publications layout

Publications uses `templates/page.html` and the shared `academic.css` fonts, palette, navigation, and 880px reading container. `assets/css/publications.css` adds a sticky 125px year rail with a 28px gap, continuous ruled entries, and optional paper figures beside the text. Citation counts show their source and retrieval date; native BibTeX disclosures expose wrapping citation text and download links. At 767px the rail becomes a static wrapping row; at 575px figures stack below the text. The renderer is `scripts/publications_site.py`.

## Elevation & Depth

The shared research and publication surfaces are flat. Separation comes from spacing and one-pixel rules. Navigation explicitly has no shadow. The existing calendar uses a border and a tonal surface; no additional elevation token is established here.

**The Ruled Surface Rule.** Separate research and publication groups with space and thin rules; the inline experiment shares that same surface.

## Shapes

Controls have small rounded corners, while the portrait is circular. The inherited calendar is a softly rounded, clipped container. Native range controls retain browser geometry with an accent color. Plot geometry is functional: hollow target circles, filled simulated circles, thin connectors, and axes. These are data marks, not illustrations.

## Components

### Buttons and presets

Quiet text actions use an underline and a minimum height (44px); hover changes them to the primary text color. Experiment preset buttons use a muted one-pixel border and the control radius. Their selected state is an accent fill with the theme background as text. Hover underlines the label; `aria-pressed` exposes selection. Button, link, and disclosure focus uses an accent outline (2px) with an offset (4px).

### Inputs / Fields

Search and native selects use the background surface, muted border, full available width, and minimum height (44px). Placeholder text uses the muted foreground without reduced opacity. Form focus uses an accent outline (2px) with an offset (3px). Range controls span their column and have the same minimum height. No custom error, disabled, or loading appearance is established.

### Navigation and disclosures

The fixed navigation uses plain text, accent hover, and a heavier accent active item. Its links and toggles have a minimum target height (44px); mobile links align right in the expanded menu. The skip link appears on focus. Native disclosures preserve their markers and readable summaries for biography, abstracts, methods, and the calendar.

### Publication rows and calendar

Publication rows pair a sans-serif title with complete authors, muted venue metadata, a takeaway, wrapping underlined research links, and optional abstract disclosure. Citation copying has live feedback and a selectable textarea fallback. Filters expose a count and an actionable empty state; their settings follow the URL and browser history. Paper anchors can reveal a filtered-out entry.

The calendar is an incumbent disclosure container, not a research-card template. Its header and embedded content stay within a rounded border.

### Interactive population illustration

Two independent native ranges and three presets update actual marks for 24 deterministic synthetic people. Neutral hollow targets and accent-filled simulated marks distinguish roles without relying only on color. A second plot shows an additional response dimension. A live reading, reset action, assumptions disclosure, static conclusion, and research links accompany the plots. URL parameters preserve settings.

The enhancement is optional: controls are initially hidden, while the explanation remains available without JavaScript. Plot updates have no authored animation. Legacy global theme transitions are implementation history, not the experiment's motion grammar.

## Do's and Don'ts

### Do:

- Do retain the established fonts, portrait, and light/dark theme pairing.
- Do use visible focus, native controls, wrapping action rows, and readable static content alongside enhancements.
- Do label illustrative plots and keep their readable conclusion and research links.

### Don't:

- Don't add decorative project cards or additional branding motifs to this approved extension.
- Don't present synthetic plot values as paper results or a live model.
- Don't make the legacy theme-wide transition or icon-font implementation a default for new components.

Not canonized or repaired: inherited icon-font rendering and the global `transition: all 750ms !important` remain outside the reusable guidance; this documentation pass preserves the approved incumbent rather than expanding those legacy patterns.

