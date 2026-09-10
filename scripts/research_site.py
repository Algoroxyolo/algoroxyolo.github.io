"""Question-led reading paths and progressive enhancements for the academic site."""
from html import escape, unescape
import re
from urllib.parse import urlencode


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
<p><a href="/research/chameleon-limit/">Read the research behind this question</a> · <a href="/projects/chameleon-limit/">Explore the paper’s experiments</a></p>
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

    # Academic visitors need identity, research fit, and evidence without extra clicks.
    portrait = '<figure class="home-portrait"><img src="/assets/img/Yunze%20Xiao.jpg" width="480" height="480" alt="Portrait of Yunze Xiao"></figure>'
    intro = '<div class="home-intro">' + portrait + '<div><p>' + biography + '</p></div></div><div class="home-interests"><p>' + named_interests() + '</p></div><p class="academic-contact home-contact">' + r.link('mailto:' + d['profile']['email'], d['profile']['email']) + ' · ' + r.link('/assets/pdf/Yunze_Xiao.pdf', 'CV (PDF)') + ' · ' + r.link('/publications/', 'All publications') + ' · ' + r.link('https://github.com/' + d['profile']['github'], 'GitHub') + ' · ' + r.link('/teaching/', 'Teaching & mentoring') + '</p>'
    selected = '<section class="home-selected"><div class="section-heading"><h2>Selected publications</h2>' + r.link('/publications/', 'All publications & preprints') + '</div><p class="academic-note">* Equal contribution.</p><ol class="academic-publications">' + ''.join(r.publication(k, True) for k in d['selected_publications']) + '</ol></section>'
    project_links = '<section class="home-project-links"><h2>Research projects &amp; interactive explanations</h2><ul>' + ''.join('<li>' + r.link('/research/' + p['slug'] + '/', p['name']) + ' — ' + escape(p['question']) + '</li>' for p in d['projects']) + '</ul><p id="population-lab">' + r.link('/research/chameleon-limit/#population-lab', 'Try the persona fidelity and diversity illustration') + '</p></section>'
    contact = '<section id="contact" class="contact-section"><h2>Contact</h2><p>' + r.link('mailto:' + d['profile']['email'], d['profile']['email']) + ' · GHC 5418, Carnegie Mellon University</p><p class="academic-note">4902 Forbes Ave · Pittsburgh, PA 15213</p>' + calendar + '</section>'
    outputs['index.html'] = r.template('home.html', {'INTRO':intro, 'TAGLINE':escape(d['profile']['tagline']), 'SELECTED':selected + project_links, 'NEWS':r.news(True, limit=3), 'CALENDAR':contact})

    body = '<p class="page-lead">From human-like behavior to collective social dynamics: three questions connect my work.</p><nav class="section-jumps" aria-label="Research questions">' + ''.join(r.link('#' + q['slug'], q['label']) for q in questions) + '</nav>'
    for q in questions:
        body += '<section class="research-theme" id="' + q['slug'] + '"><h2>' + escape(q['question']) + '</h2><p>' + escape(q['description']) + '</p><ul class="theme-evidence">'
        for key in q['papers']:
            pub = r.pubs[key]; finding = d['findings'].get(key)
            project = projects.get(key)
            if not finding and project: finding = project['finding']
            body += '<li><h3>' + paper_link(key) + '</h3>' + ('<p>' + escape(finding) + '</p>' if finding else '') + '<p class="academic-note">' + str(pub['year']) + ' · ' + r.tex(pub['venue']) + '</p></li>'
        body += '</ul><div class="open-question"><h3>Looking ahead</h3><p>' + escape(q['next']) + '</p></div><p>' + r.link('/publications/?' + urlencode({'topic':q['slug']}), 'Browse papers on this theme') + '</p></section>'
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
        body += '<section><h2>What we studied</h2><p>' + escape(project['method']) + '</p><h3>My contribution</h3><p>' + escape(project['role']) + '</p></section>'
        if key == 'chameleon': body += experiment()
        body += '<section><h2>How to read the result</h2><p>' + escape(note['scope']) + '</p></section><section><h2>Paper &amp; authors</h2><ol class="academic-publications">' + r.publication(key, True) + '</ol></section>'
        body += '<section class="related-reading"><h2>Continue the question</h2><ul>' + ''.join('<li>' + paper_link(k) + '</li>' for k in note['related']) + '</ul><p>' + r.link('/research/', 'Back to all research questions') + '</p></section>'
        outputs['research/' + project['slug'] + '/index.html'] = r.page(project['name'], '/research/' + project['slug'] + '/', body, project['theme'])

    # Search/filter controls enhance an entirely static publication archive.
    archive = outputs['publications/index.html']
    archive = archive.replace('href="#published"', 'href="/publications/?status=published#published"').replace('href="#preprints"', 'href="/publications/?status=preprint#preprints"')
    filters = '<form id="publication-filters" class="publication-filters" role="search" hidden><div class="search-field"><label for="paper-search">Find a paper</label><input id="paper-search" name="q" type="search" placeholder="Title, author, or keyword" autocomplete="off"></div><div><label for="paper-topic">Research theme</label><select id="paper-topic" name="topic"><option value="">All themes</option>' + ''.join('<option value="' + q['slug'] + '">' + escape(q['label']) + '</option>' for q in questions) + '</select></div><div><label for="paper-status">Status</label><select id="paper-status" name="status"><option value="">All papers</option><option value="published">Published</option><option value="preprint">Preprints</option></select></div><button type="button" id="clear-filters" class="text-button">Clear filters</button></form><p id="paper-count" class="academic-note" role="status" aria-live="polite" hidden></p><p id="paper-empty" hidden>No papers match these filters. Try another term or clear the filters.</p>'
    archive = archive.replace('<article class="academic-content">', '<article class="academic-content">' + filters)
    for pub in d['publications']:
        key = pub['key']; topics = [slug for slug, keys in web['paper_topics'].items() if key in keys]
        data = ' data-topics="' + ' '.join(topics) + '" data-status="' + pub['group'] + '"'
        old = 'id="' + r.anchor(key) + '" class="academic-publication"'
        archive = archive.replace(old, old + data)
        citation = plain(r.tex(pub['authors'])) + '. ' + str(pub['year']) + '. ' + plain(r.tex(pub['title'])) + '. ' + plain(r.tex(pub['venue'])) + ' ' + pub['url']
        target = r.publication(key)
        copy = '<div class="citation-tools" hidden><button type="button" class="text-button copy-citation" data-citation="' + escape(citation, quote=True) + '" aria-label="Copy citation for ' + escape(plain(r.tex(pub['title'])), quote=True) + '">Copy citation</button><span class="citation-feedback" role="status" aria-live="polite"></span><textarea class="citation-fallback" aria-label="Citation text to copy manually" readonly hidden>' + escape(citation) + '</textarea></div>'
        # Insert before the final li closing tag, using the full entry to avoid neighboring papers.
        decorated = target.replace(old, old + data)
        archive = archive.replace(decorated, decorated.rsplit('</li>',1)[0] + copy + '</li>')
    outputs['publications/index.html'] = archive

    writing = '<p class="page-lead">Research ideas, explained through writing and interactive experiments.</p>'
    for post in web['writing']:
        writing += '<section class="writing-entry"><h2>' + r.link(post['url'], post['title']) + '</h2><p>' + escape(post['description']) + '</p><p>' + r.link(post['url'], 'Read the essay') + ' · ' + paper_link(post['paper']) + '</p></section>'
    writing += '<section><h2>Try the idea</h2><p>Matching a persona and preserving population diversity are different tests. Change one while holding the other still.</p><p>' + r.link('/research/chameleon-limit/#population-lab', 'Open the interactive illustration') + '</p></section><p>' + r.link('/blog/', 'Browse the full writing archive') + '</p>'
    outputs['writing/index.html'] = r.page('Writing', '/writing/', writing)
    # Keep full interests in the CV, with descriptive web references.
    outputs['cv/index.html'] = outputs['cv/index.html'].replace(r.tex(d['research_interests']), named_interests())
    return outputs
