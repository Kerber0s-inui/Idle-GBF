# Formation Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the formation screen so weapons render as a left main slot plus right 3x3 sub-grid and summons render as a left main slot plus right 2x2 sub-grid, without adding equip interaction.

**Architecture:** Keep the existing formation domain output unchanged and reshape only the UI layer in `FormationScreen`. Add structural wrappers and CSS classes for main-slot and sub-grid regions, then update UI tests to assert the new structure while preserving current slot counts and empty-slot behavior.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS

---

### Task 1: Add structural UI tests for formation layout

**Files:**
- Modify: `src/ui/mvpScreens.test.tsx`
- Modify: `src/ui/screens/FormationScreen.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing test**

Add assertions in `src/ui/mvpScreens.test.tsx` that the formation screen renders dedicated containers for:

- weapon main slot
- weapon sub-grid
- summon main slot
- summon sub-grid

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/ui/mvpScreens.test.tsx`
Expected: FAIL because the new test ids or structure do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Update `src/ui/screens/FormationScreen.tsx` to split the existing generated slots into main and sub groups and render them in dedicated layout containers. Update `src/styles.css` to style:

- a two-column formation layout
- a tall left main slot
- a 3x3 right weapon matrix
- a 2x2 right summon matrix

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- src/ui/mvpScreens.test.tsx`
Expected: PASS

- [ ] **Step 5: Run broader verification**

Run: `npm.cmd test`
Expected: PASS
