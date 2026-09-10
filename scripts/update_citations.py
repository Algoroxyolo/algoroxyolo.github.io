"""Import a verified Google Scholar browser snapshot; never mix citation providers."""
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
import argparse
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
PROFILE_ID = '95n7XTkAAAAJ'
PROFILE_URL = 'https://scholar.google.com/citations?user=' + PROFILE_ID + '&hl=en'


def normalized(title):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', title).lower())


def import_snapshot(data, snapshot):
    profile = urlsplit(snapshot['profile_url'])
    if profile.hostname != 'scholar.google.com' or parse_qs(profile.query).get('user') != [PROFILE_ID]:
        raise ValueError('Snapshot is not from the configured Google Scholar profile')
    if snapshot.get('end') is not True:
        raise ValueError('Expand Show more until the complete article list is visible')
    total = snapshot['profile_total']
    if type(total) is not int or total < 0: raise ValueError('Missing or invalid profile citation total')
    updated = datetime.fromisoformat(snapshot['retrieved_at'].replace('Z', '+00:00')).date().isoformat()
    rows = snapshot['rows'] + snapshot.get('search_records', [])
    papers = {}
    for paper in data['publications']:
        matches = [r for r in rows if normalized(r['title']) == normalized(paper['title'])]
        verified = snapshot.get('verified_article_links', {}).get(paper['key'])
        if not matches and verified and verified['publication_url'].rstrip('/') == paper['url'].rstrip('/'):
            matches = [r for r in rows if parse_qs(urlsplit(r['article_url']).query).get('citation_for_view') == [verified['citation_for_view']]]
        if len(matches) > 1: raise ValueError('Ambiguous Scholar match: ' + paper['key'])
        if not matches:
            papers[paper['key']] = {'count': None, 'status': 'not_matched', 'updated': updated}
            continue
        row = matches[0]
        raw = row['citation_text'].replace(',', '').strip()
        if raw and not re.fullmatch(r'\d+\*?', raw): raise ValueError('Unrecognized Scholar count: ' + raw)
        # An indexed profile row with an empty Cited by cell displays no citations.
        count = int(raw.rstrip('*')) if raw else 0
        source_url = row['cited_by_url'] or row['article_url']
        if urlsplit(source_url).hostname != 'scholar.google.com':
            raise ValueError('Citation link must point to Google Scholar')
        papers[paper['key']] = {'count': count, 'status': 'matched', 'source_url': source_url, 'article_url': row['article_url'], 'matched_title': row['title'], 'scholar_marker': '*' if raw.endswith('*') else '', 'updated': updated}
    return {'source': 'Google Scholar', 'updated': updated, 'profile_url': PROFILE_URL, 'profile_total': total, 'scope': 'Profile total is taken directly from Google Scholar, not summed from this selected publication list.', 'papers': papers}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, default=ROOT / 'data/google-scholar.json')
    args = parser.parse_args()
    data = json.loads((ROOT / 'data/academic.json').read_text(encoding='utf-8'))
    snapshot = json.loads(args.snapshot.read_text(encoding='utf-8'))
    result = import_snapshot(data, snapshot)
    (ROOT / 'data/citations.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Google Scholar profile citations:', result['profile_total'])
    print('Matched:', sum(p['count'] is not None for p in result['papers'].values()), '/', len(result['papers']))
    print('Unmatched:', [k for k, p in result['papers'].items() if p['count'] is None])


if __name__ == '__main__': main()
