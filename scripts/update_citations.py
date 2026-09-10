"""Refresh dated OpenAlex counts without guessing missing matches. Run before build_academic.py."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import urlopen, Request
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]


def normalized(title):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', title).lower())


def get(url):
    with urlopen(Request(url, headers={'User-Agent': 'YunzeAcademicSite/1.0'}), timeout=25) as response:
        return json.load(response)


def identifiers(p):
    url = p['url']
    if 'aclanthology.org/' in url:
        return ['10.18653/v1/' + url.rstrip('/').split('/')[-1]]
    if 'arxiv.org/abs/' in url:
        return ['10.48550/arXiv.' + url.split('/abs/')[-1]]
    if 'doi.org/' in url: return [url.split('doi.org/')[-1]]
    if '/article/10.' in url: return [url.split('/article/')[-1]]
    if 'nature.com/articles/' in url: return ['10.1038/' + url.split('/articles/')[-1]]
    if 'abstract_id=' in url: return ['10.2139/ssrn.' + url.split('abstract_id=')[-1]]
    if re.fullmatch(r'\d{4}\.\d{4,5}', p['key']): return ['10.48550/arXiv.' + p['key']]
    return []


def fetch(p):
    try:
        match = None
        for doi in identifiers(p):
            try:
                match = get('https://api.openalex.org/works/https://doi.org/' + quote(doi, safe='/'))
                break
            except HTTPError as error:
                if error.code != 404: raise
        if match is None:
            candidates = get('https://api.openalex.org/works?' + urlencode({'search': p['title'], 'per-page': 5}))['results']
            for candidate in candidates:
                title_match = SequenceMatcher(None, normalized(p['title']), normalized(candidate['display_name'])).ratio() >= .97
                author_match = any(normalized(a['author']['display_name']) == 'yunzexiao' for a in candidate['authorships'])
                if title_match and author_match:
                    match = candidate
                    break
        if match is None: return p['key'], {'count': None, 'status': 'not_indexed'}
        return p['key'], {'count': match['cited_by_count'], 'status': 'matched', 'source_url': match['id'], 'matched_title': match['display_name'], 'doi': match.get('doi')}
    except Exception as error:
        return p['key'], {'count': None, 'status': 'unavailable', 'error': str(error)}


def main():
    data = json.loads((ROOT / 'data/academic.json').read_text(encoding='utf-8'))
    target = ROOT / 'data/citations.json'
    previous = json.loads(target.read_text(encoding='utf-8')) if target.exists() else {'papers': {}}
    today = datetime.now(timezone.utc).date().isoformat()
    with ThreadPoolExecutor(max_workers=3) as pool:
        papers = dict(pool.map(fetch, data['publications']))
    for key, record in papers.items():
        if record['status'] == 'unavailable' and previous['papers'].get(key, {}).get('count') is not None:
            papers[key] = {**previous['papers'][key], 'stale': True, 'last_attempt': today}
        else:
            record['updated'] = today
    snapshot = {'source': 'OpenAlex', 'updated': today, 'scope': 'Listed work records; not a Google Scholar author-profile total. Versions may have different counts.', 'papers': papers}
    target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Citation records:', len(papers), 'matched:', sum(p['count'] is not None for p in papers.values()))
    print('Unavailable:', [(k, p.get('error', p['status'])) for k, p in papers.items() if p['count'] is None])


if __name__ == '__main__': main()
