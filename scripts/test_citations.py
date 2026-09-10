"""Keep Scholar totals, missing data and citation-provider identity distinct."""
import copy
import json
import unittest
from update_citations import ROOT, import_snapshot


class ScholarCitationTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'data/academic.json').read_text(encoding='utf-8'))
        self.snapshot = json.loads((ROOT / 'data/google-scholar.json').read_text(encoding='utf-8'))

    def test_profile_total_is_not_selected_paper_sum(self):
        result = import_snapshot(self.data, self.snapshot)
        self.assertEqual(result['profile_total'], self.snapshot['profile_total'])
        self.assertEqual(len(result['papers']), len(self.data['publications']))
        self.assertTrue(all(p['count'] is not None for p in result['papers'].values()))
        self.assertNotEqual(result['profile_total'], sum(p['count'] for p in result['papers'].values()))

    def test_missing_record_does_not_become_zero(self):
        self.snapshot['rows'] = [r for r in self.snapshot['rows'] if 'TartanMaroon' not in r['title']]
        self.assertIsNone(import_snapshot(self.data, self.snapshot)['papers']['2026.acl-demo.83']['count'])

    def test_blank_indexed_row_is_zero(self):
        self.assertEqual(import_snapshot(self.data, self.snapshot)['papers']['2026.acl-demo.83']['count'], 0)

    def test_wrong_profile_and_incomplete_list_are_rejected(self):
        wrong = copy.deepcopy(self.snapshot)
        wrong['profile_url'] = 'https://scholar.google.com/citations?user=other'
        with self.assertRaisesRegex(ValueError, 'profile'): import_snapshot(self.data, wrong)
        self.snapshot['end'] = False
        with self.assertRaisesRegex(ValueError, 'complete'): import_snapshot(self.data, self.snapshot)

    def test_scholar_marker_and_verified_title_change_survive(self):
        result = import_snapshot(self.data, self.snapshot)
        self.assertEqual(result['papers']['2024.acl-long.102']['scholar_marker'], '*')
        self.assertIn('RHpTSmoSYBkC', result['papers']['2026.eacl-long.23']['article_url'])


if __name__ == '__main__': unittest.main()
