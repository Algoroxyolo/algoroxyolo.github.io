"""Render the academic website and LaTeX CV from data/academic.json (stdlib only)."""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import argparse, calendar, hashlib, json, re, shutil, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/academic.json'

def digest(data): return hashlib.sha256(data).hexdigest()
def read(path): return path.read_text(encoding='utf-8')
def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or read(path) != text:
        path.write_text(text, encoding='utf-8')

def brace(s, i):
    while i < len(s) and s[i].isspace(): i += 1
    if i >= len(s) or s[i] != '{': raise ValueError('Expected a braced text argument')
    start = i + 1; depth = 1; i += 1
    while depth and i < len(s):
        if s[i] == '\\': i += 2; continue
        if s[i] == '{': depth += 1
        elif s[i] == '}': depth -= 1
        i += 1
    if depth: raise ValueError('Unclosed text argument')
    return s[start:i-1], i

def anchor(key): return 'paper-' + re.sub(r'[^a-zA-Z0-9_-]', '-', key)
def month(value):
    y, m = map(int, value.split('-')[:2])
    return calendar.month_abbr[m] + ('.' if m != 5 else '') + f' {y}'
def dates(entry): return month(entry['start']) + ' -- ' + (month(entry['end']) if entry['end'] else 'Present')
def latex_text(text):
    return text.replace('&', r'\&').replace('%', r'\%').replace('_', r'\_').replace('–', '--')

class Renderer:
    anchor = staticmethod(anchor)
    def __init__(self, data):
        self.d = data
        self.pubs = {p['key']: p for p in data['publications']}
        if len(self.pubs) != len(data['publications']): raise ValueError('Duplicate publication keys')
        self.labels = {}; counts = {'published': 0, 'preprint': 0}
        for p in data['publications']:
            counts[p['group']] += 1
            self.labels[p['key']] = ('P' if p['group'] == 'published' else 'W') + str(counts[p['group']])
        if len({anchor(k) for k in self.pubs}) != len(self.pubs): raise ValueError('Duplicate stable anchors')
        for k in data['selected_publications'] + [p['publication'] for p in data['projects']]:
            if k not in self.pubs: raise ValueError('Unknown publication: ' + k)
        for e in data['education']:
            if (e['status'] == 'in_progress') != (e['end'] is None): raise ValueError('Degree status/end date disagree')
        for question in data['website']['questions']:
            for key in question['papers']:
                if key not in self.pubs: raise ValueError('Unknown question paper: ' + key)
        for keys in data['website']['paper_topics'].values():
            if any(k not in self.pubs for k in keys): raise ValueError('Unknown topic paper')

    def tex(self, s):
        out = ''; i = 0
        while i < len(s):
            if s[i] == '\\':
                m = re.match(r'\\([a-zA-Z]+|.)', s[i:]); cmd = m[1]; i += len(m[0])
                if cmd in ['textbf', 'textit', 'mbox', 'href', 'pubref']:
                    val, i = brace(s, i)
                    if cmd == 'href':
                        title, i = brace(s, i); out += self.link(val, self.tex(title), raw=True)
                    elif cmd == 'pubref': out += self.ref(val)
                    else:
                        tag = dict(textbf='strong', textit='em', mbox='span')[cmd]
                        out += f'<{tag}>{self.tex(val)}</{tag}>'
                elif cmd in ['enskip', 'quad', 'newline']: out += ' '
                elif cmd == 'textbar': out += ' | '
                elif cmd in ['&', '%', '_', '#']: out += escape(cmd)
                else: raise ValueError('Unsupported LaTeX command: ' + cmd)
            elif s[i:i+2] == '--': out += '–'; i += 2; continue
            else: out += ' ' if s[i] == '~' else escape(s[i]); i += 1
        return out

    def link(self, url, label, raw=False):
        if urlsplit(url).scheme not in ('', 'https', 'http', 'mailto'): raise ValueError('Unsupported link scheme')
        return f'<a href="{escape(url, quote=True)}">{label if raw else escape(label)}</a>'
    def ref(self, key): return self.link('/publications/#' + anchor(key), '[' + self.labels[key] + ']')
    def resources(self, p):
        links = [{'label': 'Paper', 'url': p['url']}] + p['links']
        project = next((x for x in self.d['projects'] if x['publication'] == p['key']), None)
        if project: links += project['links']
        seen = set(); result = []
        for a in links:
            if a['url'] in seen: continue
            seen.add(a['url']); result.append(self.link(a['url'], a['label']))
        return '<div class="paper-links">' + ' '.join(result) + '</div>'

    def publication(self, key, selected=False):
        p = self.pubs[key]; ids = '' if selected else f' id="{anchor(key)}"'
        aliases = '' if selected else f'<span id="pub-{self.labels[key]}"></span>'
        if p.get('legacy_anchor') and not selected: aliases += f'<span id="{escape(p["legacy_anchor"])}"></span>'
        finding = self.d['findings'].get(key)
        takeaway = f'<p class="paper-takeaway">{escape(finding)}</p>' if finding else ''
        abstract = f'<details class="paper-abstract"><summary>Abstract</summary><p>{escape(p["abstract"])}</p></details>' if p.get('abstract') and not selected else ''
        return f'''<li{ids} class="academic-publication">{aliases}
<h3>{self.link(p['url'], self.tex(p['title']), raw=True)} <span class="pub-label">[{self.labels[key]}]</span></h3>
{takeaway}<p class="paper-authors">{self.tex(p['authors'])}.</p>
<p class="paper-venue">{p['year']}. {self.tex(p['venue'])}</p>
{self.resources(p)}{abstract}</li>'''

    def entries(self, entries):
        result = ''
        for e in entries:
            date = dates(e) if 'start' in e else e['date']
            result += '<div class="academic-entry"><div class="entry-heading"><h3>' + self.tex(e['institution']) + '</h3><span class="entry-date">' + self.tex(date) + '</span></div>'
            result += '<p class="entry-context">' + self.tex(e['position']) + (' · ' + self.tex(e['location']) if e['location'] else '') + '</p>'
            result += '<ul>' + ''.join('<li>' + self.tex(x) + '</li>' for x in self.entry_items(e)) + '</ul></div>'
        return result

    def entry_items(self, e):
        if 'advisor' not in e: return e['items']
        line = 'Advisor: \\textbf{' + latex_text(e['advisor']) + '}'
        if e.get('gpa'): line += ' \\enskip\\textbar\\enskip GPA: ' + latex_text(e['gpa'])
        if e.get('minor'): line += ' \\enskip\\textbar\\enskip Minor in ' + latex_text(e['minor'])
        return [line] + [latex_text(h) for h in e.get('honors', [])]

    def mentoring(self):
        result = '<section id="research-mentoring"><h2>Research Mentoring</h2><ul class="mentoring-list">'
        for e in self.d['mentoring']:
            result += '<li><div class="entry-heading"><h3>' + escape(e['name']) + '</h3><span class="entry-date">' + self.tex(dates(e)) + '</span></div><p>'
            result += escape(e['level'] + ', ' + e['institution'] + ' · ' + ', '.join(e['topics'])) + '.'
            for k in e['publications']:
                short_title = next((p['name'] for p in self.d['projects'] if p['publication'] == k), None)
                title = escape(short_title) if short_title else self.tex(self.pubs[k]['title'])
                result += ' ' + self.link('/publications/#' + anchor(k), title + ' [' + self.labels[k] + ']', raw=True) + '.'
            result += '</p></li>'
        return result + '</ul></section>'

    def teaching(self):
        return '<section><h2>Teaching</h2><ul class="academic-service">' + ''.join('<li><span class="entry-date">' + self.tex(e['date']) + '</span> <strong>' + self.tex(e['course']) + '</strong>, ' + self.tex(e['role']) + '</li>' for e in self.d['teaching']) + '</ul></section>'

    def service(self):
        result = '<section><h2>Academic Service</h2>'
        for g in self.d['service']:
            result += '<h3>' + self.tex(g['title']) + '</h3><ul class="academic-service">'
            for e in g['entries']:
                result += '<li><span class="entry-date">' + self.tex(e['date']) + '</span> <strong>' + self.tex(e['organization']) + '</strong>, ' + self.tex(e['role']) + '</li>'
            result += '</ul>' + ''.join('<p>' + self.tex(n) + '</p>' for n in g['notes'])
        return result + '</section>'

    def news(self, home=False):
        rows = ''.join('<tr><th scope="row">' + escape(n['date']) + '</th><td>' + n['body_html'] + '</td></tr>' for n in self.d['news'][:5 if home else None])
        return ('<h2>' + self.link('/news/', 'news') + '</h2>' if home else '') + '<div class="news"><div class="table-responsive"><table class="table table-sm table-borderless">' + rows + '</table></div></div>' + ('<p>' + self.link('/news/', 'All news') + '</p>' if home else '')

    def template(self, name, values):
        s = read(ROOT / 'templates' / name)
        display = self.d['profile']['display_name'].split(' ', 1)
        heading = '<span class="font-weight-bold">' + escape(display[0]) + '</span>' + (' ' + escape(display[1]) if len(display) > 1 else '')
        values = {'DISPLAY_NAME': escape(self.d['profile']['display_name']), 'NAME': escape(self.d['profile']['name']), 'NAME_HEADING': heading, 'EMAIL': escape(self.d['profile']['email']), **values}
        values['STYLE_VERSION'] = digest(read(ROOT / 'assets/css/academic.css').encode('utf-8'))[:12]
        values['SCRIPT_VERSION'] = digest(read(ROOT / 'assets/js/research.js').encode('utf-8'))[:12]
        route = values.get('ROUTE', '/')
        nav = [('/', 'Home'), ('/research/', 'Research'), ('/publications/', 'Publications'), ('/writing/', 'Writing'), ('/cv/', 'CV')]
        values['NAVIGATION'] = ''.join('<li class="nav-item' + (' active' if route == url or url == '/research/' and route.startswith('/research/') else '') + '"><a class="nav-link" href="' + url + '"' + (' aria-current="page"' if route == url else '') + '>' + label + '</a></li>' for url,label in nav)
        for k, v in values.items(): s = s.replace('{{' + k + '}}', v)
        remaining = re.findall(r'\{\{[A-Z_]+\}\}', s)
        if remaining: raise ValueError('Missing template values: ' + str(remaining))
        return s

    def page(self, title, route, body, subtitle=''):
        title = {'publications':'Publications', 'cv':'CV', 'news':'News', 'teaching &amp; mentoring':'Teaching &amp; Mentoring'}.get(title, title)
        s = self.template('page.html', {'TITLE': title, 'ROUTE': route, 'BODY': body, 'SUBTITLE': subtitle, 'DESCRIPTION': escape(title.capitalize() + ' by ' + self.d['profile']['name'])})
        return s

    def website(self):
        d = self.d; master, bachelor = d['education']; p = d['profile']
        if master['status'] == 'in_progress':
            intro = 'I am pursuing an ' + escape(master['position']) + ' at ' + escape(master['institution']) + '’s '
        else: intro = 'I received my ' + escape(master['position']) + ' in ' + month(master['end']) + ' from ' + escape(master['institution']) + '’s '
        intro += self.link(master['institution_url'], master['unit']) + ', ' + ('advised by ' if master['status'] == 'in_progress' else 'where I was advised by ') + self.link(master['advisor_url'], 'Prof. ' + master['advisor']) + '.'
        intro += ' I received my ' + escape(bachelor['position']) + ' from ' + escape(bachelor['institution']) + ' in ' + month(bachelor['end']) + ', with a minor in ' + escape(bachelor['minor']) + ', working with ' + self.link(bachelor['advisor_url'], 'Prof. ' + bachelor['advisor']) + ' and ' + self.link(bachelor['additional_advisor_url'], 'Prof. ' + bachelor['additional_advisor']) + '.'
        biography = intro
        intro = '<div class="clearfix academic-intro"><p>' + intro + '</p><p>' + self.tex(d['research_interests']) + '</p><p class="academic-contact">' + self.link('mailto:' + p['email'], p['email']) + ' · ' + self.link('/assets/pdf/Yunze_Xiao.pdf', 'Academic CV (PDF)') + ' · ' + self.link('/projects/', 'Research projects') + '</p></div>'
        selected = '<h2>' + self.link('/publications/', 'selected publications') + '</h2><ol class="academic-publications">' + ''.join(self.publication(k, True) for k in d['selected_publications']) + '</ol><p>' + self.link('/publications/', 'All publications and preprints') + '</p>'
        cal = '<details class="calendar-card calendar-disclosure"><summary>Schedule a conversation<span>View my calendar</span></summary><div class="calendar-card__header"><p class="calendar-card__note">Times shown in ' + escape(d['calendar']['timezone_label']) + '. You can also ' + self.link('mailto:' + p['email'], 'email me') + '.</p></div><div class="calendar-card__embed"><iframe loading="lazy" src="' + escape(d['calendar']['url'], quote=True) + '" title="Yunze Xiao’s availability calendar"></iframe></div></details>'
        outputs = {'index.html': self.template('home.html', {'INTRO': intro, 'NEWS': self.news(True), 'SELECTED': selected, 'CALENDAR': cal, 'TAGLINE': escape(p['tagline'])})}
        body = '<p class="academic-note">* Equal contribution. ' + self.link('#published', 'Published') + ' · ' + self.link('#preprints', 'Preprints') + '</p>'
        for group, title in [('published', 'Published'), ('preprint', 'Preprints')]:
            body += f'<section id="{title.lower()}"><h2>{title}</h2><ol class="academic-publications">' + ''.join(self.publication(x['key']) for x in d['publications'] if x['group'] == group) + '</ol></section>'
        outputs['publications/index.html'] = self.page('publications', '/publications/', body, 'Published papers and preprints, ordered by year within each section.')
        body = '<p>' + self.link('/assets/pdf/Yunze_Xiao.pdf', 'Download academic CV (PDF)') + ' · Updated ' + calendar.month_name[int(d['updated'][5:7])] + ' ' + d['updated'][:4] + '</p>'
        for key, title in [('education', 'Education'), ('research', 'Research Experience')]:
            body += '<section><h2>' + title + '</h2>' + self.entries(d[key]) + '</section>'
            if key == 'education': body += '<section><h2>Research Interests</h2><p>' + self.tex(d['research_interests']) + '</p></section>'
        body += '<section><h2>Publications</h2><p>' + self.link('/publications/', 'Full publication list') + '</p></section>' + self.mentoring() + self.service() + '<section><h2>Talks &amp; Presentations</h2><ul>' + ''.join('<li>' + self.tex(t['text']) + '</li>' for t in d['talks']) + '</ul></section>' + self.teaching()
        outputs['cv/index.html'] = self.page('cv', '/cv/', body)
        body = self.mentoring()
        if d['additional_mentoring']:
            body += '<section><h2>Additional Research Mentoring</h2>' + ''.join('<p><strong>' + escape(x['name']) + '</strong> · Mentorship began in ' + str(x['start_year']) + '. ' + self.link(x['url'], 'Website') + '.</p>' for x in d['additional_mentoring']) + '</section>'
        body += self.teaching() + '<section><h2>NLP Ethics in a Nutshell</h2><p>' + escape(d['course_description']['text']) + '</p><p>' + self.link(d['course_description']['materials'], 'Course materials (PDF)') + '</p></section>'
        outputs['teaching/index.html'] = self.page('teaching &amp; mentoring', '/teaching/', body)
        outputs['news/index.html'] = self.page('news', '/news/', self.news())
        from research_site import enhance
        outputs = enhance(self, outputs, biography, cal)
        sitemap = read(ROOT / 'sitemap.xml')
        for name in outputs:
            route = '/' + name.removesuffix('index.html')
            url = 'https://algoroxyolo.github.io' + route
            if '<loc>' + url + '</loc>' not in sitemap:
                sitemap = sitemap.replace('</urlset>', '<url><loc>' + url + '</loc></url>\n</urlset>')
        outputs['sitemap.xml'] = sitemap
        return outputs

    def cv_files(self):
        d = self.d; outputs = {}; notice = '% Generated from the website data/academic.json; edit that source and rebuild.\n'
        for key, title in [('education', 'Education'), ('research', 'Research Experience')]:
            s = '\\cvsection{' + title + '}\n\\begin{cventries}\n'
            for e in d[key]:
                args = [e['position'], e['institution'], e['location'], dates(e) if 'start' in e else e['date'], '\\begin{cvitems}\n' + ''.join('\\item{' + v + '}\n' for v in self.entry_items(e)) + '\\end{cvitems}']
                s += '\\cventry\n' + '\n'.join('  {' + v + '}' for v in args) + '\n'
            outputs[f'cv/{key}.tex'] = notice + s + '\\end{cventries}\n'
        outputs['cv/interests.tex'] = notice + '\\cvsection{Research Interests}\n{\\fontsize{10pt}{12pt}\\bodyfont\\color{text}\\noindent\n' + d['research_interests'] + '\n\\par}\n'
        s = '\\clearpage\n\\cvsection{Publications}\n{\\fontsize{9pt}{11pt}\\bodyfont\\color{text}\\noindent * Equal contribution. Author order follows the original publications.\\par}\n'
        for group, title in [('published', 'Published'), ('preprint', 'Preprints')]:
            if group == 'preprint': s += '\\needspace{5\\baselineskip}\n'
            s += '\\cvsubsection{' + title + '}\n'
            if group == 'preprint': s += '\\setcounter{cvpublication}{0}\n\\renewcommand{\\thecvpublication}{W\\arabic{cvpublication}}\n'
            s += '\\begin{cvpubs}\n'
            for p in d['publications']:
                if p['group'] != group: continue
                body = p['authors'] + '. ' + str(p['year']) + '. \\href{' + p['url'] + '}{' + p['title'] + '}. ' + p['venue']
                s += '\\begin{samepage}\n\\pubentry{' + p['key'] + '}{' + body + '}\n\\par\\end{samepage}\n'
            s += '\\end{cvpubs}\n'
        outputs['cv/publications.tex'] = notice + s
        s = '\\cvsection{Research Mentoring}\n{\\fontsize{10pt}{12pt}\\bodyfont\\color{text}\n\\noindent\\begin{tabular*}{\\textwidth}{@{}l@{\\extracolsep{\\fill}}r@{}}\n'
        for e in d['mentoring']:
            s += '\\textbf{' + latex_text(e['name']) + '} (' + latex_text(e['short_institution']) + ', ' + e['level'].lower() + '): ' + latex_text(', '.join(e['short_topics']))
            s += ''.join(' \\pubref{' + k + '}' for k in e['publications']) + '. & \\textit{' + dates(e) + '} \\\\[3pt]\n'
        outputs['cv/mentoring.tex'] = notice + s + '\\end{tabular*}\\par}\n'
        s = '\\cvsection{Academic Service}\n'
        for g in d['service']:
            s += '\\cvsubsection{' + g['title'] + '}\n\\begin{cvhonors}\n'
            for e in g['entries']: s += '\\cvhonor' + ''.join('{' + e[k] + '}' for k in ['organization', 'role', 'location', 'date']) + '\n'
            s += '\\end{cvhonors}\n'
            if g['notes']: s += '{\\fontsize{10pt}{12pt}\\bodyfont\\color{text}\\noindent\n' + '\\par\n\\noindent'.join(g['notes']) + '\\par}\n'
        outputs['cv/extracurricular.tex'] = notice + s
        outputs['cv/presentation.tex'] = notice + '\\cvsection{Talks \\& Presentations}\n\\begin{cvpubs}\n' + ''.join('\\cvpub{' + t['text'] + '}\n\n' for t in d['talks']) + '\\end{cvpubs}\n'
        outputs['cv/teaching.tex'] = notice + '\\cvsection{Teaching}\n\\begin{cvhonors}\n' + ''.join('\\cvhonor' + ''.join('{' + e[k] + '}' for k in ['course', 'role', 'location', 'date']) + '\n' for e in d['teaching']) + '\\end{cvhonors}\n'
        return outputs

class Links(HTMLParser):
    def __init__(self, s):
        super().__init__(); self.ids = []; self.links = []; self.feed(s)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        for k in ('src','href'):
            if k in a: self.links.append(a[k])

def validate(outputs):
    docs = {name: Links(text) for name, text in outputs.items()}
    errors = []
    for name, doc in docs.items():
        if len(doc.ids) != len(set(doc.ids)): errors.append(name + ': duplicate IDs')
        for link in doc.links:
            u = urlsplit(link)
            if u.scheme or u.netloc: continue
            target = (ROOT / unquote(u.path.lstrip('/'))) if u.path.startswith('/') else (ROOT / name).parent / unquote(u.path)
            if not u.path: target = ROOT / name
            if target.is_dir() or u.path.endswith('/'): target /= 'index.html'
            rel = target.resolve().relative_to(ROOT).as_posix()
            if rel not in outputs and not target.exists(): errors.append(name + ': missing ' + link); continue
            if u.fragment and target.suffix == '.html':
                dest = docs.get(rel) or Links(read(target))
                if unquote(u.fragment) not in dest.ids: errors.append(name + ': missing anchor ' + link)
    if errors: raise ValueError('\n'.join(errors))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cv-dir', type=Path, help='Existing LaTeX CV workspace; regenerates and compiles its academic sections')
    parser.add_argument('--check', action='store_true', help='Check generated pages, PDF provenance, and optional CV workspace without writing')
    args = parser.parse_args()
    data_bytes = DATA.read_bytes(); renderer = Renderer(json.loads(data_bytes))
    outputs = renderer.website(); cv = renderer.cv_files(); validate(outputs)
    cv_hash = digest(json.dumps(cv, sort_keys=True, ensure_ascii=False).encode('utf-8'))
    manifest_path = ROOT / 'data/build-manifest.json'
    manifest = json.loads(read(manifest_path)) if manifest_path.exists() else {}
    pdf = ROOT / 'assets/pdf/Yunze_Xiao.pdf'
    if args.check:
        stale = [p for p,s in outputs.items() if not (ROOT/p).exists() or read(ROOT/p) != s]
        if args.cv_dir: stale += [p for p,s in cv.items() if not (args.cv_dir/p).exists() or read(args.cv_dir/p) != s]
        if manifest.get('source_sha256') != digest(data_bytes): stale.append('PDF source version')
        if manifest.get('cv_source_sha256') != cv_hash: stale.append('PDF layout/source generation')
        if manifest.get('pdf_sha256') != digest(pdf.read_bytes()): stale.append('PDF content')
        if stale: raise ValueError('Out-of-date outputs: ' + ', '.join(stale))
        print('Academic pages, stable references, PDF provenance, and requested CV sources are consistent.'); return
    if args.cv_dir:
        cvdir = args.cv_dir.resolve()
        if not (cvdir/'academic-cv.cls').exists() or not (cvdir/'cv.tex').exists(): raise ValueError('Use an existing academic CV workspace')
        for p,s in cv.items(): write(cvdir/p, s)
        maintex = read(cvdir/'cv.tex')
        for cmd,k in [('email','email'),('github','github'),('linkedin','linkedin')]:
            maintex = re.sub(r'(?m)^\\'+cmd+r'\{[^}]*\}', lambda m: '\\'+cmd+'{'+renderer.d['profile'][k]+'}', maintex)
        maintex = re.sub(r'(?m)^\\name\{[^}]*\}\{\}', lambda m: '\\name{'+renderer.d['profile']['name']+'}{}', maintex)
        updated = renderer.d['updated']; stamp = calendar.month_name[int(updated[5:7])]+' '+updated[:4]
        maintex = re.sub(r'updated in [A-Za-z]+ \d{4}', 'updated in '+stamp, maintex)
        write(cvdir/'cv.tex',maintex)
        result = subprocess.run(['latexmk','-xelatex','-interaction=nonstopmode','-halt-on-error','cv.tex'],cwd=cvdir,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        if result.returncode:
            sys.stderr.write(result.stdout.decode('utf-8',errors='replace')[-6000:]); raise RuntimeError('CV compilation failed; website outputs were not replaced')
        log = read(cvdir/'cv.log')
        if re.search(r'Overfull|undefined references|multiply defined',log): raise RuntimeError('Resolve CV layout/reference warnings before syncing the website')
        shutil.copy2(cvdir/'cv.pdf',pdf)
        manifest = {'source_sha256':digest(data_bytes),'cv_source_sha256':cv_hash,'pdf_sha256':digest(pdf.read_bytes())}
    elif manifest.get('source_sha256') != digest(data_bytes) or manifest.get('cv_source_sha256') != cv_hash:
        raise ValueError('Academic data or CV generation changed: pass --cv-dir to rebuild the PDF and all pages together')
    elif manifest.get('pdf_sha256') != digest(pdf.read_bytes()):
        raise ValueError('PDF changed independently: pass --cv-dir to regenerate it from the canonical data')
    for path,s in outputs.items(): write(ROOT/path,s)
    write(manifest_path,json.dumps(manifest,indent=2)+'\n')
    print(f'Rendered {sum(p.endswith(".html") for p in outputs)} academic pages and synchronized {len(renderer.pubs)} publications; PDF matches the canonical data.')

if __name__ == '__main__': main()
