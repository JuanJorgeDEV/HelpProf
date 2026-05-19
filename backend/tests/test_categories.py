from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CATEGORIES = ROOT / "backend" / "app" / "api" / "routers" / "categories.py"


class CategoryDeleteSourceTests(unittest.TestCase):
    def test_delete_category_checks_references_by_slug(self):
        source = CATEGORIES.read_text(encoding="utf-8")

        self.assertIn('"categories_get_for_delete"', source)
        self.assertIn('slug = str(cat_res.data.get("slug") or "").strip().upper()', source)
        self.assertIn('.eq("tool_category", slug)', source)
        self.assertIn('"categories_check_domain_guides"', source)


if __name__ == "__main__":
    unittest.main()
