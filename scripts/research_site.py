"""Question-led reading paths and progressive enhancements for the academic site."""
from html import escape, unescape
import re
from urllib.parse import urlencode
from pathlib import Path
import json
import struct


def plain(html):
    return unescape(re.sub(r'<[^>]+>', '', html))


def experiment():
    return '''<section class="population-lab" id="population-lab" aria-labelledby="lab-title">
<h2 id="lab-title">Same profiles. Different populations.</h2>
<p>Can simulated people match their profiles and still sound alike? Explore two different things an evaluation might measure.</p>
<p class="academic-note"><strong>Illustrative model.</strong> 24 synthetic people, no live LLM, no experimental scores from the paper.</p>
<div class="lab-interactive" hidden>
<div class="lab-presets" role="group" aria-label="Example populations">
<button type="button" data-preset="collapsed" aria-pressed="true">Accurate but alike</button>
<button type="button" data-preset="diverse" aria-pressed="false">Accurate and varied</button>
<button type="button" data-preset="drift" aria-pressed="false">Varied but off-profile</button></div>
<div class="lab-controls">
<label for="fidelity">Profile fidelity <output id="fidelity-value" for="fidelity">High</output><input id="fidelity" type="range" min="0" max="100" value="90"><span>Off-profile to closely matched</span></label>
<label for="diversity">Response diversity <output id="diversity-value" for="diversity">Low</output><input id="diversity" type="range" min="0" max="100" value="12"><span>Concentrated to spread out</span></label></div>
<div class="lab-plots">
<figure><h3>Do the profiles match?</h3><svg id="fidelity-plot" viewBox="0 0 340 228" role="img" aria-label="Target and simulated preference for each synthetic person"></svg><figcaption>Each row is a person. Hollow circles: profile targets. Filled circles: simulated preferences.</figcaption></figure>
<figure><h3>Do the responses vary?</h3><svg id="diversity-plot" viewBox="0 0 340 228" role="img" aria-label="Variation beyond the specified profiles in the synthetic population"></svg><figcaption>The same people on an additional response dimension, beyond the specified profile.</figcaption></figure></div>
<p id="lab-reading" class="lab-reading" role="status" aria-live="polite"></p>
<button type="button" class="text-button" id="lab-reset">Reset experiment</button>
</div>
<p class="lab-static">Matching explicit profile attributes does not by itself establish diversity in other behaviors. These two properties need separate evaluation.</p>
<details class="lab-method"><summary>What this illustration assumes</summary><p>The two controls are independent by construction. Profile fidelity changes the distance from 24 fixed target preferences; response diversity changes the spread of a separate, unspecified behavior. The axes are unitless and synthetic. This is a counterexample to treating fidelity as sufficient evidence of diversity, not a claim that the two are independent in real models.</p></details>
<p><a href="https://arxiv.org/abs/2604.24698">Read the paper</a> · <a href="/projects/chameleon-limit/">Explore the paper’s experiments</a></p>
</section>'''


def enhance(r, outputs, biography, calendar):
    d = r.d; web = d['website']; questions = web['questions']
    projects = {p['publication']: p for p in d['projects']}

    def title(key):
        return web['short_titles'].get(key, plain(r.tex(r.pubs[key]['title'])))

    def study_url(key):
        return '/research/' + projects[key]['slug'] + '/' if key in projects else '/publications/#' + r.anchor(key)

    def paper_link(key):
        return r.link(study_url(key), title(key))

    def named_interests():
        text = r.tex(d['research_interests'])
        def linked(phrase, key):
            return r.link('/publications/#' + r.anchor(key), phrase)
        text = text.replace(
            'anthropomorphism and human-centered evaluation ' + r.ref('humanizing') + ', ' + r.ref('culture'),
            linked('anthropomorphism', 'humanizing') + ' and ' + linked('human-centered evaluation', 'culture'))
        text = text.replace(
            'persona and multi-agent social simulation ' + r.ref('chameleon') + ', ' + r.ref('2026.findings-acl.368'),
            linked('persona', 'chameleon') + ' and ' + linked('multi-agent social simulation', '2026.findings-acl.368'))
        text = text.replace(
            'the evidential foundations of AI welfare claims ' + r.ref('ai-welfare'),
            'the evidential foundations of ' + linked('AI welfare claims', 'ai-welfare'))
        for key in r.pubs:
            text = text.replace(r.ref(key), '[' + r.link('/publications/#' + r.anchor(key), title(key)) + ']')
        return text

    figures = {
        'human-centered-evaluation': ('humanizing', '/assets/img/publications/paper-humanizing.png', 'Humanizing Machines · framework of design'),
        'social-simulation': ('chameleon', '/projects/chameleon-limit/assets/figures/fig_combined.png', 'Chameleon · population diversity and persona fidelity'),
        'trustworthy-agents': ('2026.acl-demo.83', '/assets/img/publications/paper-2026-acl-demo-83.png', 'TartanMaroon · multi-agent advising architecture'),
    }
    def figure(key, src, caption, class_name='research-figure'):
        width, height = struct.unpack('>II', (Path(__file__).resolve().parents[1] / src.lstrip('/')).read_bytes()[16:24])
        return '<figure class="' + class_name + '"><a href="' + src + '" aria-label="View full-size figure: ' + escape(caption, quote=True) + '"><img src="' + src + '" width="' + str(width) + '" height="' + str(height) + '" loading="lazy" alt="' + escape(caption, quote=True) + '"></a><figcaption>' + r.link(r.pubs[key]['url'], caption) + ' · ' + r.link(src, 'Full-size figure') + '</figcaption></figure>'

    interest = named_interests()
    agenda = json.loads((Path(__file__).resolve().parents[1] / 'data/homepage-agenda.json').read_text(encoding='utf-8'))
    agenda_html = '<p class="poster-lead">' + escape(agenda['lead']) + '</p><p>' + escape(agenda['framing']) + '</p><dl class="research-agenda">'
    for direction in agenda['directions']:
        agenda_html += '<div><dt>' + escape(direction['title']) + '</dt><dd>' + escape(direction['description']) + '</dd></div>'
    agenda_html += '</dl>'
    foundations = interest.partition('. ')[2].split(' Looking ahead,')[0]
    master = d['education'][0]
    identity = master['position'] + ' · ' + master['institution']
    if master['status'] != 'in_progress': identity += ' · Graduate'
    contact_links = r.link('mailto:' + d['profile']['email'], 'Email') + r.link('https://scholar.google.com/citations?user=95n7XTkAAAAJ&hl=en', 'Google Scholar') + r.link('/assets/pdf/Yunze_Xiao.pdf', 'CV (PDF)') + r.link('https://github.com/' + d['profile']['github'], 'GitHub')
    intro = '<header class="poster-masthead"><div class="poster-identity"><h1>' + escape(d['profile']['display_name']) + '</h1><div class="poster-person"><img src="/assets/img/Yunze%20Xiao.jpg" width="480" height="480" alt="Portrait of Yunze Xiao"><div><p>' + escape(identity) + '</p><p class="academic-note">' + r.link(master['institution_url'], master['unit']) + '</p><nav class="identity-links" aria-label="Contact and profiles">' + contact_links + '</nav></div></div></div><div class="poster-intro">' + agenda_html + '</div></header>'
    selected = '<section class="home-selected" id="selected-publications"><div class="section-heading"><h2>Selected publications</h2>' + r.link('/publications/', 'All publications & preprints') + '</div><p class="research-foundations">' + foundations + '</p><p class="academic-note">* Equal contribution.</p><div class="poster-columns">'
    for q in questions:
        fkey, src, caption = figures[q['slug']]
        selected += '<section class="poster-column" aria-labelledby="home-' + q['slug'] + '"><h3 id="home-' + q['slug'] + '">' + r.link('/research/#' + q['slug'], q['label']) + '</h3><p class="poster-question">' + escape(q['question']) + '</p>' + figure(fkey, src, caption, 'poster-figure') + '<ol class="academic-publications">'
        for key in q['papers']:
            if key not in d['selected_publications']: continue
            entry = r.publication(key, True).replace('<h3>', '<h4>').replace('</h3>', '</h4>')
            if key in projects:
                entry = entry.replace('</li>', '<p class="study-entry-link">' + r.link(study_url(key), 'Study overview') + ' · ' + escape(projects[key]['role']) + '</p></li>')
            selected += entry
        selected += '</ol><p class="theme-route">' + r.link('/research/#' + q['slug'], 'Research direction') + '</p></section>'
    selected += '</div></section>'
    contact = '<section id="contact" class="contact-section"><div><h2>Contact</h2><p>' + r.link('mailto:' + d['profile']['email'], d['profile']['email']) + '</p><p>GHC 5418, Carnegie Mellon University<br>4902 Forbes Ave · Pittsburgh, PA 15213</p><p>' + r.link('/teaching/', 'Teaching & mentoring') + ' · ' + r.link('/cv/', 'Academic CV') + '</p></div>' + calendar + '</section>'
    background = '<p>' + biography + '</p><p id="population-lab">' + r.link('/research/chameleon-limit/#population-lab', 'Chameleon: persona fidelity and diversity illustration') + '</p>'
    outputs['index.html'] = r.template('home.html', {'INTRO':intro, 'BIOGRAPHY':background, 'TAGLINE':escape(d['profile']['tagline']), 'SELECTED':selected, 'NEWS':r.news(True, limit=3), 'CALENDAR':contact})

    body = '<p class="page-lead">From human-like behavior to collective social dynamics: three questions connect my work.</p><nav class="section-jumps" aria-label="Research questions">' + ''.join(r.link('#' + q['slug'], q['label']) for q in questions) + '</nav>'
    for q in questions:
        body += '<section class="research-theme" id="' + q['slug'] + '"><div class="theme-intro"><h2>' + escape(q['question']) + '</h2><p>' + escape(q['description']) + '</p>' + figure(*figures[q['slug']]) + '</div><div class="theme-body"><ul class="theme-evidence">'
        for key in q['papers']:
            pub = r.pubs[key]; finding = d['findings'].get(key)
            project = projects.get(key)
            if not finding and project: finding = project['finding']
            body += '<li><h3>' + paper_link(key) + '</h3>' + ('<p>' + escape(finding) + '</p>' if finding else '') + '<p class="academic-note">' + str(pub['year']) + ' · ' + r.tex(pub['venue']) + '</p></li>'
        body += '</ul><div class="open-question"><h3>Looking ahead</h3><p>' + escape(q['next']) + '</p></div><p>' + r.link('/publications/?' + urlencode({'topic':q['slug']}), 'Browse papers on this theme') + '</p></div></section>'
    body += '<section id="projects"><h2>Inside three studies</h2><div class="study-index">'
    for project in d['projects']:
        body += '<section id="' + project['slug'] + '"><h3>' + r.link('/research/' + project['slug'] + '/', project['name']) + '</h3><p>' + escape(project['question']) + '</p></section>'
    body += '</div></section><details class="project-archive"><summary>Earlier projects</summary><ul><li>' + r.link('/projects/2_project/', 'Early coursework: Auto Question Generator') + '</li><li>' + r.link('/projects/1_project/', 'Earlier study notes: ethical hacking certification preparation') + '</li></ul></details>'
    outputs['research/index.html'] = r.page('Research', '/research/', body)
    # Keep bookmarked /projects/ URLs and their old fragments usable.
    outputs['projects/index.html'] = outputs['research/index.html']

    for project in d['projects']:
        key = project['publication']; note = web['study_notes'][project['slug']]; pub = r.pubs[key]
        body = '<nav class="breadcrumbs" aria-label="Breadcrumb">' + r.link('/research/', 'Research') + ' / ' + escape(project['name']) + '</nav><p class="project-question">' + escape(project['question']) + '</p><p class="study-finding">' + escape(project['finding']) + '</p>' + r.resources(pub)
        study_src = '/projects/chameleon-limit/assets/figures/fig_combined.png' if key == 'chameleon' else '/assets/img/publications/' + r.anchor(key) + '.png'
        body += figure(key, study_src, project['name'] + ' · figure from the paper')
        body += '<section><h2>What we studied</h2><p>' + escape(project['method']) + '</p><h3>My contribution</h3><p>' + escape(project['role']) + '</p></section>'
        body += '<section><h2>How to read the result</h2><p>' + escape(note['scope'].replace('The interactive illustration below explains a distinction; it does not reproduce the paper’s measurements.', 'The illustration below uses synthetic data to explain persona fidelity and population diversity.')) + '</p></section><section><h2>Paper &amp; authors</h2><ol class="academic-publications">' + r.publication(key, True) + '</ol></section>'
        if key == 'chameleon': body += experiment()
        body += '<section class="related-reading"><h2>Continue the question</h2><ul>' + ''.join('<li>' + paper_link(k) + '</li>' for k in note['related']) + '</ul><p>' + r.link('/research/', 'Back to all research questions') + '</p></section>'
        outputs['research/' + project['slug'] + '/index.html'] = r.page(project['name'], '/research/' + project['slug'] + '/', body, project['theme'])

    # Search/filter controls enhance an entirely static publication archive.
    from publications_site import topic_controls
    filters = '<form id="publication-filters" class="publication-filters" role="search" hidden>' + topic_controls(r) + '<div class="search-field"><label for="paper-search">Find a paper</label><input id="paper-search" name="q" type="search" placeholder="Title, author, or keyword" autocomplete="off"></div><div><label for="paper-status">Status</label><select id="paper-status" name="status"><option value="">All papers</option><option value="published">Published</option><option value="preprint">Preprints</option></select></div><button type="button" id="clear-filters" class="text-button">Clear filters</button></form><p id="paper-count" class="academic-note" role="status" aria-live="polite" hidden></p><p id="paper-empty" hidden>No papers match these filters. Try another term or clear the filters.</p>'
    from publications_site import render
    outputs['publications/index.html'] = render(r, filters, outputs)

    writing = '<p class="page-lead">Research essays and notes on language models, evaluation, and agent systems.</p><div class="writing-list">'
    archive = (Path(__file__).resolve().parents[1] / 'blog/index.html').read_text(encoding='utf-8')
    entries = re.findall(r'<h2 class="blog-card__title">\s*<a href="([^"]+)">(.*?)</a>\s*</h2>(.*?)(?=<h2 class="blog-card__title">|$)', archive, re.S)
    for url, post_title, tail in entries:
        description = re.search(r'<p class="blog-card__desc">(.*?)</p>', tail, re.S)
        date = re.search(r'([A-Z][a-z]{2} \d{1,2}, \d{4})', tail)
        writing += '<section class="writing-entry">' + ('<p class="entry-date">' + date[1] + '</p>' if date else '') + '<div><h2>' + r.link(url, plain(post_title)) + '</h2>' + ('<p>' + escape(plain(description[1])) + '</p>' if description else '') + '<p>' + r.link(url, 'Read essay') + '</p></div></section>'
    writing += '</div><p>' + r.link('/blog/', 'Full writing archive & series') + '</p>'
    outputs['writing/index.html'] = r.page('Writing', '/writing/', writing)
    # Keep full interests in the CV, with descriptive web references.
    outputs['cv/index.html'] = outputs['cv/index.html'].replace(r.tex(d['research_interests']), named_interests())
    return outputs
