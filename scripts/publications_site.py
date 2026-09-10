"""Year-based publication portfolio; academic facts stay in academic.json."""
from collections import Counter
from hashlib import sha256
from html import escape, unescape
from pathlib import Path
import re
import struct

ROOT = Path(__file__).resolve().parents[1]


def plain(value):
    return unescape(re.sub(r'<[^>]+>', '', value))


def render(r, filters):
    pubs = r.d['publications']
    years = sorted({p['year'] for p in pubs}, reverse=True)
    counts = Counter(p['group'] for p in pubs)
    themes = {q['slug']: q['label'] for q in r.d['website']['questions']}
    nav = '<a class="collection-link" href="#showcase-top">All publications</a>'
    nav += ''.join(f'<a class="collection-link" href="#year-{year}"><span aria-hidden="true">▦</span> {year}</a>' for year in years)
    metrics = ''.join(f'<div class="portfolio-metric"><strong>{count}</strong><span>{label}</span></div>' for count, label in [(len(pubs), 'Publications'), (counts['published'], 'Published'), (counts['preprint'], 'Preprints')])
    body = ''
    for year in years:
        group = [p for p in pubs if p['year'] == year]
        body += f'<section class="publication-year" id="year-{year}"><header class="year-heading"><h2>{year}</h2><p>{len(group)} papers · Published work and preprints</p></header><ol class="portfolio-cards">'
        for p in group:
            key = p['key']; title = r.tex(p['title']); authors = r.tex(p['authors'])
            topics = [slug for slug, keys in r.d['website']['paper_topics'].items() if key in keys]
            aliases = f'<span class="paper-anchor" id="pub-{r.labels[key]}"></span>'
            if p.get('legacy_anchor'):
                aliases += f'<span class="paper-anchor" id="{escape(p["legacy_anchor"])}"></span>'
            venue = plain(r.tex(p['venue']))
            badge = venue if p['group'] == 'published' else 'Preprint'
            # Venue text remains intact in the accessible card, including track details.
            media = '/projects/chameleon-limit/assets/figures/fig_combined.png' if key == 'chameleon' else ''
            thumbnail = ROOT / 'assets/img/publications' / (r.anchor(key) + '.png')
            if thumbnail.exists(): media = '/assets/img/publications/' + thumbnail.name
            role = 'Published research' if p['group'] == 'published' else 'Preprint'
            citation = f'{plain(authors)}. {p["year"]}. {plain(title)}. {venue} {p["url"]}'
            body += f'<li id="{r.anchor(key)}" class="academic-publication" data-topics="{" ".join(topics)}" data-status="{p["group"]}">{aliases}'
            body += f'<div class="portfolio-card-heading"><div><p class="paper-kind">{role}</p><h3>{r.link(p["url"], title, raw=True)}</h3></div><span class="venue-badge">{escape(badge)}</span></div>'
            body += '<div class="portfolio-card-body' + (' has-media' if media else '') + '"><div class="paper-copy"><p class="paper-authors">' + authors + '.</p>'
            if r.d['findings'].get(key):
                body += '<p class="paper-takeaway">' + escape(r.d['findings'][key]) + '</p>'
            body += '<p class="paper-venue">' + str(year) + ' · ' + r.tex(p['venue']) + ' <span class="pub-label">[' + r.labels[key] + ']</span></p>'
            if topics:
                body += '<ul class="paper-tags" aria-label="Research themes">' + ''.join('<li>' + escape(themes[t]) + '</li>' for t in topics) + '</ul>'
            body += '</div>'
            if media:
                width, height = struct.unpack('>II', (ROOT / media.lstrip('/')).read_bytes()[16:24])
                body += '<a class="paper-preview" href="' + escape(p['url'], quote=True) + '"><img loading="lazy" decoding="async" width="' + str(width) + '" height="' + str(height) + '" src="' + media + '" alt="' + escape('Research figure: ' + plain(title), quote=True) + '"></a>'
            body += '</div><div class="portfolio-card-actions">' + r.resources(p)
            body += '<div class="citation-tools" hidden><button type="button" class="text-button copy-citation" data-citation="' + escape(citation, quote=True) + '" aria-label="Copy citation for ' + escape(plain(title), quote=True) + '">Copy citation</button><span class="citation-feedback" role="status" aria-live="polite"></span><textarea class="citation-fallback" aria-label="Citation text to copy manually" readonly hidden>' + escape(citation) + '</textarea></div></div>'
            if p.get('abstract'):
                body += '<details class="paper-abstract"><summary>Abstract</summary><p>' + escape(p['abstract']) + '</p></details>'
            body += '</li>'
        body += '</ol></section>'
    css = (ROOT / 'assets/css/publications.css').read_text(encoding='utf-8')
    return r.template('publications.html', {'TITLE': 'Publications', 'ROUTE': '/publications/', 'COLLECTIONS': nav, 'METRICS': metrics, 'FILTERS': filters, 'BODY': body, 'PUBLICATION_STYLE_VERSION': sha256(css.encode()).hexdigest()[:12]})
