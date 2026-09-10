"""Small regression checks for the content synchronization contract."""
import copy
import json
import unittest
from build_academic import DATA, Renderer, anchor, validate

class AcademicContentTests(unittest.TestCase):
    def setUp(self): self.data = json.loads(DATA.read_bytes())

    def test_current_site_has_valid_internal_links(self):
        validate(Renderer(self.data).website())

    def test_publication_reordering_keeps_research_links_stable(self):
        original = Renderer(self.data)
        reordered = copy.deepcopy(self.data)
        reordered['publications'][0], reordered['publications'][1] = reordered['publications'][1], reordered['publications'][0]
        new = Renderer(reordered)
        key = '2026.findings-acl.368'
        self.assertNotEqual(original.labels[key], new.labels[key])
        for renderer in (original, new):
            self.assertIn('/publications/#' + anchor(key), renderer.website()['index.html'])
            self.assertIn('\\pubref{' + key + '}', renderer.cv_files()['cv/research.tex'])
        validate(new.website())

    def test_graduation_updates_homepage_and_cv_together(self):
        self.data['education'][0].update(status='completed', end='2026-05')
        renderer = Renderer(self.data)
        self.assertIn('I received my MS in Language Technology in May 2026', renderer.website()['index.html'])
        self.assertIn('Aug. 2025 -- May 2026', renderer.cv_files()['cv/education.tex'])
        self.assertNotIn('I am pursuing', renderer.website()['index.html'])

    def test_conflicting_degree_status_is_rejected(self):
        self.data['education'][0]['end'] = '2026-05'
        with self.assertRaisesRegex(ValueError, 'status/end date'): Renderer(self.data)

    def test_missing_paper_does_not_silently_break_project_links(self):
        self.data['publications'] = [p for p in self.data['publications'] if p['key'] != 'chameleon']
        with self.assertRaisesRegex(ValueError, 'Unknown publication'): Renderer(self.data)

if __name__ == '__main__': unittest.main()
