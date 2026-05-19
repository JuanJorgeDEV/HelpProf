from __future__ import annotations

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "supabase" / "migrations" / "20260518160000_seed_help_prof_docx_content.sql"


class StaticAssetTests(unittest.TestCase):
    def test_docx_seed_migration_contains_expected_tools_and_40_pills(self):
        sql = SEED.read_text(encoding="utf-8")

        for slug in (
            "CANVA",
            "WORD",
            "POWERPOINT",
            "GOOGLE_FORMS",
            "EXCEL",
            "GOOGLE_CLASSROOM",
            "KAHOOT",
            "ONEDRIVE",
        ):
            self.assertIn(f"'{slug}'", sql)

        self.assertEqual(len(re.findall(r"\('DOCX-[0-9]{2}'", sql)), 40)
        self.assertIn("ON CONFLICT (seed_key) DO UPDATE", sql)

    def test_home_lume_calls_backend_and_renders_result_panel(self):
        index_html = (ROOT / "index.html").read_text(encoding="utf-8")
        home_js = (ROOT / "js" / "home.js").read_text(encoding="utf-8")

        self.assertIn('id="lume-result"', index_html)
        self.assertIn('id="lume-suggestions"', index_html)
        self.assertIn('"/lume/query"', home_js)
        self.assertIn('"scenario": "home"', home_js)
        self.assertIn("renderLumeResult", home_js)

    def test_pill_page_lume_uses_pill_context(self):
        pilula_html = (ROOT / "pilula.html").read_text(encoding="utf-8")
        pill_js = (ROOT / "js" / "pill-page.js").read_text(encoding="utf-8")

        self.assertIn('id="pill-lume-form"', pilula_html)
        self.assertIn('id="pill-lume-result"', pilula_html)
        self.assertIn('"/lume/query"', pill_js)
        self.assertIn('"scenario": "pill"', pill_js)
        self.assertIn("currentPillId", pill_js)


if __name__ == "__main__":
    unittest.main()
