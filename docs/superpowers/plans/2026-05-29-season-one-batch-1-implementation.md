# Season One Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the first visible season-one UI pass: synced weapon/summon stars, richer upgrade stat previews, and formation bond feedback.

**Architecture:** Extend existing content/types with lightweight bond metadata, reuse current progression helpers for white-stat previews, and keep UI changes inside the existing `UpgradeScreen` and `FormationScreen` flows. Tests stay focused on user-visible behavior in the current React screen test files.

**Tech Stack:** React, TypeScript, Zustand store, Vitest, Testing Library

---

### Task 1: Add bond metadata to content types

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/content.ts`

- [ ] Add `bondTags` to `Character` and keep the shape small enough for current content.
- [ ] Populate the existing fire-route characters with initial tags that support at least one active and one near-active bond.

### Task 2: Surface synced stars and stat previews in upgrade UI

**Files:**
- Modify: `src/ui/screens/UpgradeScreen.tsx`
- Modify: `src/styles.css`
- Test: `src/ui/upgradeScreen.test.tsx`

- [ ] Make weapon and summon cards use the same star presentation as characters.
- [ ] Remove `突破 N` text from weapon and summon cards while keeping aria labels.
- [ ] Add three white-stat preview rows for weapon and summon upgrade dialogs.
- [ ] Add focused tests for synced stars and stat preview content.

### Task 3: Show bond tags and bond summary in formation UI

**Files:**
- Modify: `src/ui/screens/FormationScreen.tsx`
- Modify: `src/styles.css`
- Test: `src/ui/mvpScreens.test.tsx`

- [ ] Show bond tags on equipped character cards and character picker entries.
- [ ] Add an active/near-active bond summary block below the current formation.
- [ ] Keep the layout compact enough for mobile and verify with screen tests.

### Task 4: Verify and keep the work scoped

**Files:**
- Test: `src/ui/upgradeScreen.test.tsx`
- Test: `src/ui/mvpScreens.test.tsx`

- [ ] Run focused screen tests for upgrade and formation behavior.
- [ ] Run a production build to catch type or styling regressions.
