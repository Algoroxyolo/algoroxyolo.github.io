"""Year-based publication portfolio; academic facts stay in academic.json."""
from collections import Counter
from hashlib import sha256
from html import escape, unescape
from pathlib import Path
import re
import struct
import json

ROOT = Path(__file__).resolve().parents[1]


def plain(value):
    return unescape(re.sub(r'<[^>]+>', '', value))


def bibtex(r, p):
    def tex(value):
        return re.sub(r'([&%_#])', r'\\\1', value).replace('{', r'\{').replace('}', r'\}')
    authors = plain(r.tex(p['authors'])).replace('*', '').replace(', and ', ', ').replace(' and ', ', ')
    names = [name.strip() for name in authors.split(',') if name.strip()]
    proceedings = 'aclanthology.org/' in p['url'] or 'proceedings.neurips.cc/' in p['url']
    fields = {'title': '{' + tex(plain(r.tex(p['title']))) + '}', 'author': ' and '.join(tex(n) for n in names), 'year': str(p['year'])}
    fields['booktitle' if proceedings else 'howpublished'] = tex(plain(r.tex(p['venue'])).rstrip('.'))
    fields['url'] = p['url']
    return '@' + ('inproceedings' if proceedings else 'misc') + '{' + r.anchor(p['key']).removeprefix('paper-') + ',\n' + ',\n'.join('  ' + k + ' = {' + v + '}' for k, v in fields.items()) + '\n}\n'


def render(r, filters, outputs):
    pubs = r.d['publications']
    years = sorted({p['year'] for p in pubs}, reverse=True)
    counts = Counter(p['group'] for p in pubs)
    themes = {q['slug']: q['label'] for q in r.d['website']['questions']}
    nav = '<a class="collection-link" href="#showcase-top">All publications</a>'
    nav += ''.join(f'<a class="collection-link" href="#year-{year}"><span aria-hidden="true">▦</span> {year}</a>' for year in years)
    snapshot = json.loads((ROOT / 'data/citations.json').read_text(encoding='utf-8'))
    records = snapshot['papers']
    indexed = {records[p['key']]['source_url']: records[p['key']]['count'] for p in pubs if records.get(p['key'], {}).get('count') is not None}
    total = sum(indexed.values())
    coverage = sum(records.get(p['key'], {}).get('count') is not None for p in pubs)
    metrics = f'<p class="publication-summary"><strong>{len(pubs)}</strong> papers · {counts["published"]} published · {counts["preprint"]} preprints · <strong>{total}</strong> OpenAlex citations</p>'
    metrics += f'<p class="citation-source">Counts for {coverage}/{len(pubs)} listed papers · Updated {escape(snapshot["updated"])} · {r.link("https://openalex.org/", "OpenAlex")} coverage differs from Google Scholar.</p>'
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
            # Venue text remains intact in the accessible card, including track details.
            media = '/projects/chameleon-limit/assets/figures/fig_combined.png' if key == 'chameleon' else ''
            thumbnail = ROOT / 'assets/img/publications' / (r.anchor(key) + '.png')
            if thumbnail.exists(): media = '/assets/img/publications/' + thumbnail.name
            citation = f'{plain(authors)}. {p["year"]}. {plain(title)}. {venue} {p["url"]}'
            bib = bibtex(r, p)
            bib_path = 'assets/bib/' + r.anchor(key) + '.bib'
            outputs[bib_path] = bib
            body += f'<li id="{r.anchor(key)}" class="academic-publication" data-topics="{" ".join(topics)}" data-status="{p["group"]}">{aliases}'
            body += f'<div class="portfolio-card-heading"><h3>{r.link(p["url"], title, raw=True)}</h3></div>'
            body += '<div class="portfolio-card-body' + (' has-media' if media else '') + '"><div class="paper-copy"><p class="paper-authors">' + authors + '.</p>'
            if r.d['findings'].get(key):
                body += '<p class="paper-takeaway">' + escape(r.d['findings'][key]) + '</p>'
            body += '<p class="paper-venue">' + str(year) + ' · ' + r.tex(p['venue']) + ' <span class="pub-label">[' + r.labels[key] + ']</span></p>'
            record = records.get(key, {})
            if record.get('count') is not None:
                body += '<p class="paper-citations">' + r.link(record['source_url'], str(record['count']) + ' citations · OpenAlex') + ' <span>(' + escape(record.get('updated', snapshot['updated'])) + (' · cached' if record.get('stale') else '') + ')</span></p>'
            else:
                body += '<p class="paper-citations">Citations unavailable · OpenAlex</p>'
            if topics:
                body += '<ul class="paper-tags" aria-label="Research themes">' + ''.join('<li>' + escape(themes[t]) + '</li>' for t in topics) + '</ul>'
            body += '</div>'
            if media:
                width, height = struct.unpack('>II', (ROOT / media.lstrip('/')).read_bytes()[16:24])
                body += '<a class="paper-preview" href="' + escape(p['url'], quote=True) + '"><img loading="lazy" decoding="async" width="' + str(width) + '" height="' + str(height) + '" src="' + media + '" alt="' + escape('Research figure: ' + plain(title), quote=True) + '"></a>'
            body += '</div><div class="portfolio-card-actions">' + r.resources(p)
            body += '<div class="citation-tools" hidden><button type="button" class="text-button copy-citation" data-citation="' + escape(citation, quote=True) + '" aria-label="Copy citation for ' + escape(plain(title), quote=True) + '">Copy citation</button><span class="citation-feedback" role="status" aria-live="polite"></span><textarea class="citation-fallback" aria-label="Citation text to copy manually" readonly hidden>' + escape(citation) + '</textarea></div></div>'
            body += '<details class="paper-bibtex"><summary>BibTeX</summary><pre><code>' + escape(bib) + '</code></pre><div class="citation-tools" hidden><button type="button" class="text-button copy-bibtex" data-citation="' + escape(bib, quote=True) + '" aria-label="Copy BibTeX for ' + escape(plain(title), quote=True) + '">Copy BibTeX</button><span class="citation-feedback" role="status" aria-live="polite"></span><textarea class="citation-fallback" aria-label="BibTeX text to copy manually" readonly hidden>' + escape(bib) + '</textarea></div><a download href="/' + bib_path + '">Download .bib</a></details>'
            if p.get('abstract'):
                body += '<details class="paper-abstract"><summary>Abstract</summary><p>' + escape(p['abstract']) + '</p></details>'
            body += '</li>'
        body += '</ol></section>'
    css = (ROOT / 'assets/css/publications.css').read_text(encoding='utf-8')
    outputs['assets/bib/yunze-xiao.bib'] = '\n'.join(bibtex(r, p) for p in pubs)
    content = metrics + '<p class="publication-downloads"><a download href="/assets/bib/yunze-xiao.bib">Download all BibTeX</a> · ' + r.link('/assets/pdf/Yunze_Xiao.pdf', 'CV (PDF)') + '</p><details class="portfolio-search"><summary>Search &amp; filter papers</summary>' + filters + '</details>'
    content += '<div class="portfolio-shell" id="showcase-top"><nav class="portfolio-rail" aria-label="Publication years">' + nav + '</nav><div class="portfolio-content"><span id="published"></span><span id="preprints"></span><p class="contribution-note">* Equal contribution.</p>' + body + '</div></div>'
    page = r.page('Publications', '/publications/', content, 'Human–AI interaction, human-centered evaluation, and multi-agent social simulation.')
    page = page.replace('class="fixed-top-nav "', 'class="fixed-top-nav publications-page"')
    page = page.replace('</head>', '<link rel="stylesheet" href="/assets/css/publications.css?v=' + sha256(css.encode()).hexdigest()[:12] + '">\n</head>')
    return '\n'.join(line.rstrip() for line in page.splitlines()) + '\n'
