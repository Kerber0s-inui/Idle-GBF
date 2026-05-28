# Growth Rules And Weapon Upgrade UI Design

## Scope

This spec defines the next upgrade-system overhaul for Idle-GBF. It covers:

- new level-cap and uncap rules for characters, weapons, and summons
- passive unlock timing for characters
- a configurable foundation for future 150-cap transcendence without enabling it yet
- a first full UI rewrite for the weapon upgrade page
- a shared page shell for character / weapon / summon upgrade tabs
- dismantle rules for weapons
- a first-pass material-cost model and drop-tier structure

This spec does **not** assign any current item as a 150-cap target yet. The system must support that future state, but all currently shipped content remains on the standard 100-cap path.

## Goals

1. Replace the current simplified growth rules with a rule-driven progression model.
2. Make upgrade results depend on actual growth state, not just one-step buttons.
3. Rebuild the upgrade screen so weapon growth uses a paged inventory grid plus modal action flow.
4. Let the UI select target outcome (`Lv`, `SLv`, `阶段`) instead of manually entering raw material counts.
5. Prepare the codebase so future character / summon UI can reuse the same interaction shell with minimal rework.

## Non-Goals

- No current item is flagged as transcendence-enabled.
- No full character upgrade modal parity in this round.
- No full summon upgrade modal parity in this round.
- No final tuning pass for material economy values in this round.

## Confirmed Product Rules

### Characters

- Base state at `0 突` uses `Lv40` as level cap.
- Each normal uncap raises level cap by `+20`.
- Standard path:
  - `0 突 = Lv40`
  - `1 突 = Lv60`
  - `2 突 = Lv80`
  - `3 突 = Lv100`
- Future transcendence path:
  - available only for specifically flagged characters later
  - after `Lv100`, up to 5 additional transcendence steps
  - each transcendence step adds `+10`
  - final cap reaches `Lv150`
- Passive unlocks:
  - passive 1 unlocks after first uncap
  - passive 2 unlocks only when both conditions are met:
    - third uncap reached
    - current level reaches `100`

### Weapons

- Base state at `0 突` uses `Lv40` as level cap.
- Each normal uncap raises level cap by `+20`.
- Standard path:
  - `0 突 = Lv40`
  - `1 突 = Lv60`
  - `2 突 = Lv80`
  - `3 突 = Lv100`
- Future transcendence path:
  - only for specifically flagged weapons later
  - supports final cap up to `Lv150`
- Skill level caps:
  - before `3 突`, max `SLv10`
  - at `3 突` and above, max `SLv15`

### Summons

- Base state at `0 突` uses `Lv40` as level cap.
- Each normal uncap raises level cap by `+20`.
- Standard path:
  - `0 突 = Lv40`
  - `1 突 = Lv60`
  - `2 突 = Lv80`
  - `3 突 = Lv100`
- Future transcendence path:
  - only for specifically flagged summons later
  - supports final cap up to `Lv150`

### Dismantle

- Characters do not support dismantle.
- Weapons support dismantle in this round.
- Summon dismantle is reserved in the interaction shell but not fully implemented in this round unless needed for consistency.
- Weapon dismantle returns:
  - `武器经验合金`: ceil(`80%` of total exp-material cost invested into current level progression)
  - `词条回路片`: ceil(`80%` of total skill-material cost invested into current skill level)
  - `武器突破块`: ceil(`80%` of total breakthrough-material cost invested into current uncap stage)
- Return rate must be centralized and configurable because it may change later.

## Data And Rule Design

### Rule Model

Progression behavior must be rule-driven instead of inferred only from current stored numbers.

Each item type needs a config shape that can express:

- `baseLevelCap`
- `normalUncapCount`
- `normalUncapStep`
- `normalMaxLevelCap`
- `transcendenceEnabled`
- `transcendenceStepCount`
- `transcendenceCapStep`
- `finalLevelCap`

Weapons also need:

- `baseSkillCap`
- `maxUncapSkillCap`

Characters also need:

- passive unlock conditions for each passive slot

### Stored State

Existing growth state stays mostly intact:

- character state:
  - `level`
  - `exp`
  - `uncap`
  - `levelCap`
- weapon state:
  - `level`
  - `exp`
  - `uncap`
  - `levelCap`
  - `skillLevel`
- summon state:
  - `level`
  - `exp`
  - `uncap`
  - `levelCap`

The new rule system should avoid storing many duplicated derived flags in save data. Instead:

- static growth rules belong in content/config definitions
- dynamic derived values are computed from content rules + stored state

### Derived Progression Helpers

The domain layer should expose helpers that answer:

- current max level cap from rule + state
- current max skill cap from rule + state
- whether transcendence is enabled for this item
- how many uncaps remain
- which passives are unlocked
- targetable `Lv` options from current state + current materials
- targetable `SLv` options from current state + current materials
- targetable `阶段` options from current state + current materials
- total invested material counts for dismantle refund

### Content Flags

A new optional capability flag should be introduced for future 150-cap content, but no current items use it yet.

Recommended pattern:

- characters, weapons, summons gain optional progression config overrides
- defaults represent the common 40→60→80→100 path
- future special cases override the config later

## Battle And Formula Effects

### Passive Gating

Current combat and breakdown logic must stop assuming both character passives are always active.

Required behavior:

- before first uncap: no passives active
- after first uncap but before `3 突 Lv100`: only passive 1 active
- after `3 突` and reaching `Lv100`: both passives active

This affects:

- formation damage breakdown
- expedition battle simulation
- any shared modifier lookup that reads character passives

### Growth Projection

Current progression projection already adjusts displayed stats. It must be updated to:

- respect the new cap rules
- respect weapon skill cap rules
- expose unlock-aware passives
- continue deriving projected stats from stored level and progression rules

## Upgrade Page UX

### Page Shell

The upgrade screen gets a top tab bar:

- `角色`
- `武器`
- `召唤石`

This round:

- weapon tab is fully rebuilt
- character and summon tabs reuse the same shell and paging model
- character / summon action depth can remain simpler than weapon flow if needed, but the structure must already fit the same long-term pattern

### Grid Layout

The main content area uses a full-width `4 x 4` item grid with pagination.

- 16 items per page
- controls:
  - previous page
  - next page
  - page indicator
- the grid remains the primary layout on screen
- no persistent side panel

### Card Content

Each grid item shows:

- icon
- name
- level
- skill level for weapons only
- uncap progress indicator

### Uncap Indicator

Display uses star-based progress:

- normal items show 3 main stars
- `0 突`: 3 hollow stars
- each standard uncap fills one star
- the third star uses a more prominent highlight color
- future transcendence-capable items will gain a fourth star
- transcendence uses one-fifth fill increments within the fourth star
- the more prominent color style must also apply there

No current item uses the fourth-star state yet, but the component must support it.

### Equipped Badge

If a weapon or summon is currently used in formation:

- show a corner badge on its card
- first label can be a single generic badge such as `编成中`
- future refinement can split this into `主手`, `子槽`, `主召`, `副召`

## Interaction Flow

### Step 1: Select Grid Item

User clicks an item card in the full-screen grid.

### Step 2: Small Action Modal

A centered small modal appears over the page. It contains:

- item icon
- item name
- current `Lv / SLv / 突破`
- action buttons:
  - `强化`
  - `突破`
  - `拆解` for weapons and summons only
  - `取消`

Buttons may be disabled with a short reason when relevant:

- `等级已满`
- `技能已满`
- `突破已满`

### Step 3: Large Confirmation Modal

Clicking an action in the small modal opens a larger centered modal.

#### Weapon Upgrade Modal

Layout reference is the user-provided mockup.

It shows:

- weapon name
- action label: `武器升级`
- target row: `LvX -> [LvY ▼]`
- cost summary on the right: `消耗: used/owned`
- buttons: `确认 / 取消`

The boxed area is a dropdown.

Dropdown options must not exceed:

- current level cap
- highest level reachable by consuming all currently owned valid materials

After selecting a target level:

- material cost updates automatically
- no raw material-count input is shown

#### Weapon Skill Upgrade Modal

Same structure:

- `SLvX -> [SLvY ▼]`
- options capped by:
  - current skill cap from uncap stage
  - highest reachable skill level from current material stock

#### Weapon Uncap Modal

Same structure:

- `阶段X -> [阶段Y ▼]`
- options capped by:
  - maximum legal uncap stage from item rule
  - highest reachable stage from current breakthrough materials

#### Weapon Dismantle Modal

No dropdown.

Instead it shows projected returns:

- `武器经验合金`
- `词条回路片`
- `武器突破块`

plus:

- `确认 / 取消`

## Material Economy Design

### Principles

- higher levels consume more materials
- higher uncap stages require stronger breakthrough materials
- higher-tier materials come from higher-tier quests
- first implementation should be intentionally lenient
- values must live in configuration so tuning can happen later without rewriting logic

### Cost Model Direction

Recommended structure:

- level cost table by level bracket
- weapon skill cost table by `SLv`
- uncap cost table by stage and item type
- future transcendence cost table kept as a separate reserved config

### Drop Model Direction

Recommended structure:

- material tiers tied to quest difficulty bands
- current stage-1 / stage-2 reward tables can be extended rather than rewritten from scratch
- low-tier materials remain broadly accessible
- higher-tier breakthrough materials come from tougher boss/material quests

## Implementation Boundaries

### This Round Must Deliver

- rule-driven standard progression model for characters / weapons / summons
- future transcendence hooks without enabling any concrete item
- passive unlock gating for characters
- full weapon tab rebuild:
  - 4x4 grid
  - pagination
  - equipped badge
  - small centered action modal with icon
  - large centered action modal
  - target dropdowns for level / skill / stage
  - automatic cost updates
  - dismantle modal and dismantle execution
- top tab shell for character / weapon / summon upgrade pages

### This Round May Stay Simplified

- full parity of character modal workflow
- full parity of summon modal workflow
- transcendence star fill activation on real items
- final economy tuning

## Testing Requirements

Tests should cover:

- cap progression by uncap stage
- skill cap switch from `10` to `15`
- passive unlock timing
- reachable target dropdown calculation from materials + caps
- dismantle refund rounding (`ceil(80%)`)
- equipped badge visibility in weapon/summon grids
- pagination behavior with more than 16 items
- modal flow:
  - grid item click
  - small action modal
  - large confirmation modal
  - dropdown selection
  - auto-updated cost
  - confirm execution

## Risks And Constraints

- Current content has only a small number of real items, so grid / pagination tests will need seeded fixtures.
- Current progression math is already connected to battle and formation displays, so passive gating must be applied carefully to avoid accidental damage regression.
- Dismantle affects inventory ownership and may interact with formation references; dismantling an equipped item must either be blocked or must safely unequip/update formation references before removal. This behavior must be made explicit during implementation.

## Recommended Explicit Implementation Decision

For this round, dismantling an equipped weapon or summon should be **blocked** with a clear message rather than silently altering formation state. This keeps the first implementation safer and easier to reason about.
