/* Progressive enhancement: the archive and research prose work without JavaScript. */
(function () {
  'use strict';
  function populationValues(fidelity, diversity) {
    const fit = Math.max(0, Math.min(100, Number(fidelity))) / 100;
    const spread = Math.max(0, Math.min(100, Number(diversity))) / 100;
    return Array.from({length: 24}, (_, i) => {
      const target = .12 + .76 * ((i * 7) % 24) / 23;
      return {target, simulated: Math.max(.03, Math.min(.97, target + (1 - fit) * .62 * Math.sin(i * 2.4 + 1))),
        response: .5 + spread * .44 * Math.sin(i * 2.399 + .8)};
    });
  }
  function matchesPaper(text, topics, status, filters) {
    return text.toLowerCase().includes(filters.q.trim().toLowerCase()) &&
      (!filters.topic || topics.includes(filters.topic)) && (!filters.status || status === filters.status);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {populationValues, matchesPaper};
  if (typeof document === 'undefined') return;

  const form = document.getElementById('publication-filters');
  if (form) {
    const search = document.getElementById('paper-search');
    const topic = document.getElementById('paper-topic');
    const status = document.getElementById('paper-status');
    const count = document.getElementById('paper-count');
    const papers = Array.from(document.querySelectorAll('.academic-publication')).map(el => ({el,
      text: Array.from(el.querySelectorAll('h3,.paper-authors,.paper-venue,.paper-takeaway,.paper-abstract,.paper-tags')).map(x => x.textContent).join(' '),
      topics: el.dataset.topics.split(' '), status: el.dataset.status}));
    let searchSession = false;
    function fromURL() {
      const params = new URL(location.href).searchParams;
      search.value = params.get('q') || '';
      topic.value = params.get('topic') || '';
      status.value = params.get('status') || '';
      if (!status.value && ['#published', '#preprints'].includes(location.hash)) {
        status.value = location.hash === '#published' ? 'published' : 'preprint';
      }
      const disclosure = document.querySelector('.portfolio-search');
      if (disclosure && (search.value || topic.value || status.value)) disclosure.open = true;
    }
    function filter(mode) {
      const filters = {q: search.value, topic: topic.value, status: status.value};
      let visible = 0;
      papers.forEach(p => { p.el.hidden = !matchesPaper(p.text, p.topics, p.status, filters); if (!p.el.hidden) visible++; });
      document.querySelectorAll('.publication-year').forEach(section => {
        section.hidden = !Array.from(section.querySelectorAll('.academic-publication')).some(p => !p.hidden);
        const link = document.querySelector('.collection-link[href="#' + section.id + '"]');
        if (link) link.hidden = section.hidden;
      });
      count.textContent = visible + ' of ' + papers.length + ' papers';
      count.hidden = false;
      document.getElementById('paper-empty').hidden = visible !== 0;
      if (mode) {
        const url = new URL(location.href);
        if (['#published', '#preprints'].includes(url.hash)) url.hash = '#showcase-top';
        Object.entries(filters).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
        if (url.href !== location.href) history[mode + 'State'](null, '', url);
      }
    }
    function revealAnchor() {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
      const target = document.getElementById(id);
      if (id === 'published' || id === 'preprints') {
        status.value = id === 'published' ? 'published' : 'preprint';
        const disclosure = document.querySelector('.portfolio-search');
        if (disclosure) disclosure.open = true;
        filter();
      }
      const paper = target && target.closest('.academic-publication');
      if (paper && paper.hidden) {
        search.value = topic.value = status.value = '';
        filter('replace');
        target.scrollIntoView();
      }
    }
    search.addEventListener('input', () => { filter(searchSession ? 'replace' : 'push'); searchSession = true; });
    search.addEventListener('blur', () => { searchSession = false; });
    [topic, status].forEach(control => control.addEventListener('change', () => filter('push')));
    form.addEventListener('submit', event => { event.preventDefault(); filter('push'); });
    document.getElementById('clear-filters').addEventListener('click', () => {
      search.value = topic.value = status.value = ''; filter('push'); search.focus();
    });
    window.addEventListener('popstate', () => { fromURL(); filter(); revealAnchor(); });
    window.addEventListener('hashchange', revealAnchor);
    form.hidden = false; fromURL(); filter(); revealAnchor();
    const collectionLinks = document.querySelectorAll('.collection-link');
    collectionLinks.forEach(link => link.addEventListener('click', () => {
      if (link.hash === '#showcase-top') {
        search.value = topic.value = status.value = ''; filter('push');
      }
    }));
    function markCollection() {
      collectionLinks.forEach(link => link.setAttribute('aria-current', String(link.hash === (location.hash || '#showcase-top'))));
    }
    window.addEventListener('hashchange', markCollection); markCollection();
  }

  document.querySelectorAll('.citation-tools').forEach(tools => {
    tools.hidden = false;
    const button = tools.querySelector('button');
    const feedback = tools.querySelector('.citation-feedback');
    const fallback = tools.querySelector('textarea');
    button.addEventListener('click', async () => {
      fallback.hidden = true;
      try {
        if (!navigator.clipboard) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(button.dataset.citation);
        feedback.textContent = button.classList.contains('copy-bibtex') ? 'BibTeX copied.' : 'Citation copied.';
      } catch (_) {
        fallback.hidden = false; fallback.focus(); fallback.select();
        feedback.textContent = 'Select and copy the citation below.';
      }
    });
  });

  const lab = document.getElementById('population-lab');
  if (lab && lab.classList.contains('population-lab')) {
    const fidelity = document.getElementById('fidelity');
    const diversity = document.getElementById('diversity');
    const readout = document.getElementById('lab-reading');
    const presets = {collapsed:[90,12], diverse:[90,90], drift:[12,90]};
    const ns = 'http://www.w3.org/2000/svg';
    function svgNode(tag, attrs, parent, content) {
      const el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      if (content) el.textContent = content;
      parent.appendChild(el); return el;
    }
    const fitPlot = document.getElementById('fidelity-plot');
    const divPlot = document.getElementById('diversity-plot');
    [fitPlot, divPlot].forEach(plot => {
      svgNode('line', {x1:24,y1:202,x2:316,y2:202,class:'plot-axis'}, plot);
      [0,.5,1].forEach(n => svgNode('text', {x:24+n*292,y:221,'text-anchor':'middle',class:'plot-label'}, plot, String(n)));
    });
    const marks = Array.from({length:24}, (_, i) => {
      const y = 15+i*7.6;
      return {
        line:svgNode('line',{x1:0,x2:0,y1:y,y2:y,class:'plot-connector'},fitPlot),
        target:svgNode('circle',{cx:0,cy:y,r:3.1,class:'plot-target'},fitPlot),
        simulated:svgNode('circle',{cx:0,cy:y,r:2.5,class:'plot-person'},fitPlot),
        response:svgNode('circle',{cx:0,cy:y,r:3.3,class:'plot-person'},divPlot)};
    });
    function level(value) { return value >= 67 ? 'High' : value >= 34 ? 'Moderate' : 'Low'; }
    function draw(sync) {
      const f = Number(fidelity.value), d = Number(diversity.value);
      const people = populationValues(f, d);
      people.forEach((p,i) => {
        const m = marks[i];
        m.target.setAttribute('cx',24+p.target*292);
        m.simulated.setAttribute('cx',24+p.simulated*292);
        m.line.setAttribute('x1',24+p.target*292); m.line.setAttribute('x2',24+p.simulated*292);
        m.response.setAttribute('cx',24+p.response*292);
      });
      ['fidelity','diversity'].forEach((id,i) => { const val = i ? d : f; document.getElementById(id+'-value').textContent = level(val); document.getElementById(id).setAttribute('aria-valuetext',level(val)); });
      readout.textContent = (f >= 67 ? 'The profiles are closely matched.' : f < 34 ? 'The simulated preferences drift from their profiles.' : 'The profiles are only partly matched.') + ' ' + (d < 34 ? 'Yet responses on the additional dimension cluster together.' : d >= 67 ? 'Responses on the additional dimension remain varied.' : 'Responses show moderate variation on the additional dimension.');
      lab.querySelectorAll('[data-preset]').forEach(button => {
        const values = presets[button.dataset.preset];
        button.setAttribute('aria-pressed',String(values[0] === f && values[1] === d));
      });
      if (sync) {
        const url = new URL(location.href);
        if (f === 90 && d === 12) { url.searchParams.delete('labf'); url.searchParams.delete('labd'); }
        else { url.searchParams.set('labf',f); url.searchParams.set('labd',d); }
        url.hash = 'population-lab';
        history.replaceState(null,'',url);
      }
    }
    function fromURL() {
      const params = new URL(location.href).searchParams;
      [fidelity,diversity].forEach((control,i) => {
        const raw = params.get(i ? 'labd' : 'labf');
        const value = raw === null || raw.trim() === '' ? NaN : Number(raw);
        control.value = Number.isFinite(value) ? Math.max(0,Math.min(100,value)) : (i ? 12 : 90);
      });
      draw(false);
    }
    lab.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
      [fidelity.value,diversity.value] = presets[button.dataset.preset]; draw(true);
    }));
    document.getElementById('lab-reset').addEventListener('click', () => { fidelity.value=90; diversity.value=12; draw(true); });
    fidelity.addEventListener('input', () => draw(true));
    diversity.addEventListener('input', () => draw(true));
    window.addEventListener('popstate', fromURL);
    lab.querySelector('.lab-interactive').hidden = false;
    fromURL();
  }
})();
