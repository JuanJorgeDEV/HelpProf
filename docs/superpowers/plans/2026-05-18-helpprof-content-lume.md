# HelpProf Content And Lume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate HelpProf with the DOCX pill content and make Lume usable from the Home and pill pages.

**Architecture:** Keep database population in an idempotent Supabase migration. Use the existing `POST /api/v1/lume/query` backend contract from the static frontend, with small UI helpers in page-specific JavaScript. Fix the category delete integrity check while touching category behavior.

**Tech Stack:** FastAPI, Supabase SQL migrations, static HTML/CSS/JS, pytest-compatible Python tests.

---

### Task 1: Regression Tests

**Files:**
- Create: `backend/tests/test_categories.py`
- Create: `tests/test_static_assets.py`

- [ ] Write failing backend test proving category delete checks `pills.tool_category` against the category slug, not UUID.
- [ ] Write failing static tests proving a new seed migration contains DOCX tools and 40 pill inserts/upserts.
- [ ] Write failing static tests proving Home and pill pages call `/lume/query`.

### Task 2: Seed Migration

**Files:**
- Create: `supabase/migrations/20260518160000_seed_help_prof_docx_content.sql`

- [ ] Insert or update categories for Canva, Word, PowerPoint, Google Forms, Excel, Google Classroom, Kahoot and OneDrive.
- [ ] Insert or update 40 pílulas using stable `(tool_category, title)` matching.
- [ ] Keep migration idempotent and safe to re-run.

### Task 3: Backend Fix

**Files:**
- Modify: `backend/app/api/routers/categories.py`

- [ ] Fetch the category slug before checking references.
- [ ] Check `pills.tool_category` and `domain_guides.tool_category` by slug before hard delete.
- [ ] Return the same public API response shape.

### Task 4: Frontend Lume Integration

**Files:**
- Modify: `index.html`
- Modify: `pilula.html`
- Modify: `js/main.js`
- Modify: `js/home.js`
- Modify: `js/pill-page.js`
- Modify: `css/styles.css`

- [ ] Remove the generic submit blocker from `main.js` so page-specific handlers own Lume.
- [ ] Add response containers to Home and pill pages.
- [ ] Implement Home Lume submit with loading, error, low confidence, suggested pill cards and suggested questions.
- [ ] Implement pill-context Lume submit with current `pill_id`.
- [ ] Add compact responsive styles for Lume result panels.

### Task 5: Verification

**Files:**
- All touched files.

- [ ] Run Python/static tests.
- [ ] Run backend import or test command with the project path configured.
- [ ] Start a local static server and inspect key pages if practical.
