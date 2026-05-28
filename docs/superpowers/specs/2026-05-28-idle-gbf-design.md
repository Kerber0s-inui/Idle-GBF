# Idle GBF Design

Date: 2026-05-28

## Summary

Build a mobile-first local PWA idle RPG. The outer loop follows Whipper-style expeditions: choose a quest, choose repeat count, wait for runs to complete, collect rewards, improve the party, and push farther. The inner growth model follows Granblue Fantasy-style party building, weapon grids, summons, and damage formula categories.

The first version prioritizes a complete playable system loop over breadth of content. It starts with one route: a fire party fighting wind enemies. Data structures should still allow six elements later.

## Core Loop

1. The player progresses through main story quests.
2. Uncleared quests require one lightweight avatar/pixel auto battle.
3. Clearing a quest records first clear and unlocks sweep farming for that quest.
4. Sweep farming lets the player choose a repeat count, capped at 100.
5. Each run takes time based on quest difficulty, roughly 5 to 10 minutes per run.
6. Completed sweep runs grant summarized rewards: experience, materials, weapons, summons, and limited gacha resources.
7. The player upgrades characters, weapons, summons, passives, and grids.
8. The improved party challenges the next uncleared quest.

Regular quests do not have turn limits. A challenge battle continues until either the enemy is defeated or the party is defeated. Failure only needs a concise result such as "challenge failed" or "party defeated." Special high-difficulty mechanics are explicitly out of scope for the first version.

## Platform

The first version is a local PWA:

- Mobile-first layout.
- Local save data.
- JSON save import/export.
- No backend account system.
- No paid currency or monetization.
- No server-side anti-cheat.

This keeps the first version fast to build while preserving a migration path to desktop or server-backed versions later.

## Visual And Asset Strategy

Use two asset modes:

- Development/local mode can map asset keys to GBFAL IDs or URLs.
- Release mode maps the same asset keys to placeholder or original assets.

The project must not commit, redistribute, or package Cygames/Granblue Fantasy assets. Local caches must be gitignored. Player-facing names are original, not copied GBF names.

Naming style: fantasy plus magic technology. Examples of acceptable flavor include furnace cores, circuits, star rails, protocols, machine gods, floating islands, and astral engines. Names should feel like RPG items or characters, not plain mechanical labels like "fire SSR attack sword."

## Content Scope

First version content:

- One main route focused on a fire party versus wind enemies.
- Free characters unlocked by main story progress.
- A game-resource gacha that can produce characters, character-linked weapons, other weapons, and summons.
- Quest drops that include grid-relevant weapons, summons, materials, experience, and limited gacha resource fragments.
- A free farmable grid path, similar in spirit to GBF's farmable weapon progression.

Out of scope for first version:

- Full six-element content.
- High-difficulty special mechanics.
- PvP.
- Guilds.
- Events and event schedules.
- Paid systems.
- Online accounts.
- Full debuff/buff ecosystem.
- Character active skills.
- Complex battle cinematics.
- Redistribution of GBF assets.

## Character Design

Characters are differentiated by base stats, element, rarity, two passive skills, and charge attack.

First version battle actions:

- Normal attacks.
- Charge attacks.

No character active skills are included in the first version.

Each character has exactly two passive slots. Passives can affect, for example:

- Personal attack or defense.
- Party attack categories.
- Charge gain.
- Charge attack damage or cap.
- Multiattack rate.
- Critical chance or critical damage.
- Damage cap.
- Survival.
- Sweep efficiency.
- Drop bonuses.

Character growth includes level, uncap/progression, passive unlock or strengthening, and charge attack strengthening.

## Battle Design

First-clear battles use lightweight avatar or pixel presentation. They are still fully automatic.

Battle flow:

1. Initialize party, enemies, grid, summons, passives, and formula modifiers.
2. Each turn, characters act in party order.
3. A character uses charge attack when charge gauge allows it.
4. Otherwise the character performs normal attacks.
5. Enemy actions are resolved automatically.
6. The battle ends when enemies are defeated or the party is defeated.

The battle result should include enough structured data for UI and tests:

- Win or loss.
- Turn logs.
- Damage records.
- Charge attack events.
- Passive effects applied or triggered.
- Final party and enemy state.

Sweep mode does not play per-run battles. It uses the first-clear state and quest configuration to generate time-based completion and reward summaries.

## Formula Design

The formula module should be separate from UI, storage, and battle flow. It should follow GBF-style categories as closely as practical:

- Normal attack modifiers.
- Magna/farmable attack modifiers.
- EX attack modifiers.
- Summon aura modifiers.
- Element advantage.
- Critical chance and expected critical value.
- Multiattack.
- Charge attack multiplier.
- Damage cap.
- Damage cap up.
- Passive modifiers.

Implementation notes must identify which formula parts are approximate or intentionally simplified. This makes later correction possible without guessing.

The formation UI should explain major contribution categories so the player can understand why a grid change increases or decreases performance.

## Expedition And Sweep Rules

Quest fields should include:

- Quest ID.
- Element.
- Difficulty tier.
- Per-run duration.
- Enemy configuration for first clear.
- Drop table.
- First-clear rewards.
- Unlock requirements.

Sweep rules:

- Only available after first clear.
- Player chooses repeat count.
- Repeat count maximum is 100.
- Total duration equals per-run duration times repeat count.
- The player can check progress before completion.
- Settlement summarizes all completed runs.

The first version can use time as the main pacing limiter. AP, tickets, stamina, or other entry resources can be added later if needed.

## Rewards And Economy

Use two reward tracks:

- Progression rewards: main story and first-clear rewards grant free characters, major gacha resources, key unlock materials, and milestones.
- Farming rewards: sweeps grant weapons, summons, skill materials, character growth resources, experience, and limited gacha resource fragments.

Gacha resources should not be infinitely farmable at high rates from sweeps. Farming can contribute slowly, but main progression should be the primary source of large pulls.

Weapon and summon acquisition uses a mixed GBF-like model:

- Gacha can grant characters, weapons, and summons.
- Quests can drop farmable weapons and summons.
- Free farmed grids should be viable for the first route.

## UI Structure

Use a mobile-first PWA interface with five bottom navigation entries:

- Expedition: main screen for quest selection, first clear, sweep setup, progress, and settlement.
- Formation: party, weapon grid, summons, power summary, and formula breakdown.
- Upgrade: character, weapon, summon, passive, uncap, and skill upgrades.
- Gacha: resource gacha, pool details, and pull history.
- Inventory: materials, weapons, summons, drop history, save import/export, and asset mode settings.

The home experience should prioritize expeditions. Formation and upgrades are nearby, but the player should first see what they are currently farming or challenging.

## Data Model

Core entities:

- Character.
- Passive.
- ChargeAttack.
- Weapon.
- WeaponSkill.
- Summon.
- Quest.
- Enemy.
- PartyLoadout.
- WeaponGrid.
- Inventory.
- PlayerProgress.
- GachaPool.
- RewardTable.
- BattleResult.
- ExpeditionRun.
- SaveFile.

Save data must include a version number. Imports should validate schema and migrate old versions when possible.

## Architecture

Suggested implementation architecture:

- TypeScript PWA frontend.
- React/Vite or a similarly lightweight frontend stack.
- Pure TypeScript domain modules for formulas, battles, expedition settlement, rewards, gacha, and save migration.
- UI components call domain modules but do not own core rules.
- Asset resolver maps stable asset keys to either local/development GBFAL references or release placeholders/original files.

Suggested module boundaries:

- `formula`: damage and modifier calculations.
- `battle`: first-clear auto battle simulation.
- `expedition`: sweep timing and settlement.
- `progression`: unlocks, story progress, first-clear flags.
- `inventory`: owned characters, weapons, summons, materials, currencies.
- `gacha`: pools, probabilities, pull results.
- `save`: persistence, import/export, schema validation, migration.
- `assets`: asset key resolution and mode switching.
- `ui`: PWA screens and presentation.

## Testing Strategy

Test domain logic before UI polish:

- Formula tests for attack categories, summon aura, element advantage, critical expected value, charge attack, caps, and passive modifiers.
- Battle tests for win/loss, charge attack timing, normal attacks, enemy damage, and passive application.
- Expedition tests for first-clear gating, repeat count cap, duration calculation, progress, and settlement.
- Reward tests for drop aggregation, first-clear rewards, and limited gacha resource generation.
- Save tests for import, export, validation, and version migration.

UI testing should cover the main mobile flow:

1. Start first-clear battle.
2. Win and unlock sweep.
3. Start sweep with a chosen count.
4. Settle rewards.
5. Upgrade and adjust formation.
6. Pull gacha with earned resources.
7. Export and import save data.

## Open Decisions For Implementation Planning

- Exact frontend framework and UI library.
- Initial naming set for characters, weapons, summons, and materials.
- Exact GBF formula references and first-pass approximation list.
- First route quest count and progression pacing.
- Whether to implement sweep completion using real wall-clock time immediately or a test-friendly accelerated clock in development mode.
