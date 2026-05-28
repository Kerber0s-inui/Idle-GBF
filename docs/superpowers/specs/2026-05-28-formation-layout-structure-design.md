# Formation Layout Structure Design

Date: 2026-05-28

## Summary

This change updates the formation screen so the weapon grid and summon grid match the original GBF-style spatial structure more closely, without adding new interaction or progression behavior.

The scope is intentionally limited to layout structure:

- Weapon grid becomes `left 1 + right 3x3`.
- Summon grid becomes `left 1 + right 2x2`.
- Existing slot content, labels, empty-slot behavior, and derived stat breakdown remain in place.
- No manual equip, slot swapping, picker modal, or inventory filtering is added in this change.

## Current State

The current formation screen renders weapon and summon slots as uniform card grids:

- Weapons: 10 slots rendered in one repeated grid.
- Summons: 5 slots rendered in one repeated grid.

Slots are currently passive display elements rather than interactive controls:

- The screen renders plain `div` containers for each slot.
- No `onClick` handlers are attached.
- The game store exposes upgrade and reward actions, but no formation editing actions.
- Grid contents are auto-filled from owned inventory order through `createWeaponGrid` and `createSummonGrid`.

Because of that, clicking a slot currently does nothing by design. This is not a regression introduced by the layout work.

## Goals

- Make the formation area read like the original game at a glance.
- Preserve the current MVP and stage-2 behavior boundaries.
- Avoid mixing a visual layout refactor with a new equipment-management feature.

## Non-Goals

- No slot click interaction.
- No equipment selection modal or drawer.
- No drag-and-drop.
- No main/sub slot reassignment logic.
- No new persistence fields for formation editing.
- No skin or chrome recreation beyond the structural arrangement.

## Layout Design

### Weapon Grid

The weapon area will be split into two regions:

- Main weapon: one tall slot on the left.
- Sub weapons: nine slots on the right in a 3-column by 3-row matrix.

This maps the existing 10 generated slots to a `1 + 9` structure without changing data ownership:

- Slot `0` remains the main weapon.
- Slots `1` through `9` remain sub weapons.
- Empty slots remain visible in their structural positions.

### Summon Grid

The summon area will also be split into two regions:

- Main summon: one tall slot on the left.
- Sub summons: four slots on the right in a 2-column by 2-row matrix.

This maps the existing 5 generated slots to a `1 + 4` structure:

- Slot `0` remains the main summon.
- Slots `1` through `4` remain sub summons.
- Empty slots remain visible in their structural positions.

### Mobile Behavior

The interface is still mobile-first, so the structure should stay recognizable on narrow screens:

- Keep the left main slot visually distinct.
- Keep the right-side matrix compact and aligned.
- Allow the whole formation section to stack vertically only if the viewport becomes too narrow to preserve readable slot content.

The priority is preserving the semantic `main-left / sub-grid-right` relationship rather than forcing a single desktop-style width at all costs.

## Rendering Approach

The implementation should keep using the current formation domain output and only reshape the UI layer:

- Reuse `createWeaponGrid` and `createSummonGrid`.
- Derive `main` and `sub` slot collections in the formation screen.
- Render dedicated containers for the main slot and the sub-slot matrix.
- Preserve existing test ids for each slot so current coverage can be adapted rather than rewritten from scratch.

## Testing

Update UI tests to verify:

- 10 weapon slots still render.
- 5 summon slots still render.
- Main weapon and main summon render in dedicated structural containers.
- Sub weapon slots render in a 3x3 group.
- Sub summon slots render in a 2x2 group.
- Empty slots still appear when inventory is smaller than full grid size.

No interaction tests are required for slot clicking in this change because interaction is out of scope.
