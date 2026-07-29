# maomao Rectangles Extraction Branch

## Purpose

This branch adapts the native TypeScript Rectangles generator for the offline
level-production pipeline of maomao / 猫猫解谜.

maomao is a Cocos Creator 3.8.8 WeChat Mini Game based on the Rectangles /
Shikaku puzzle mechanic.

## Branch Policy

- `main` remains an unmodified mirror of `yoniLavi/puzzles-ts`.
- maomao-specific work must not be committed to `main`.
- This branch may contain CLI tools, JSON exporters, adapters, filters and tests.
- This branch must not contain Pet Rooms-specific exporters or product rules.
- The Cocos Creator runtime must not depend directly on this repository.
- Runtime puzzle generation is prohibited.
- Generated and approved levels will be exported as frozen JSON data.
- Original Rectangles tests, fixtures and license information must be preserved.

## Upstream

- Repository: https://github.com/yoniLavi/puzzles-ts
- Base commit: `388d8ce17b253c84a41c72e5fd39c7ec31a39419`
- License: MIT

## Consumer

- Repository: https://github.com/linghulaoqi/maomao
- Engine: Cocos Creator 3.8.8
- Language: TypeScript
- Target platform: WeChat Mini Game
- Integration model: frozen JSON files only

## Current maomao Level Concepts

The maomao level format currently includes concepts such as:

- `schemaVersion`
- `levelId`
- `chapter`
- `order`
- `width`
- `height`
- `difficulty`
- `clues`
- `solutionRegions`
- `tutorial`
- `contentVersion`

The exporter must adapt generated Rectangles puzzles into the maomao level
schema. The maomao runtime must not read native puzzles-ts `desc` or `aux`
values directly.

## Planned Scope

1. Identify the minimum Rectangles generator dependency set.
2. Preserve deterministic generation by seed.
3. Add deterministic batch generation.
4. Export candidate puzzles as JSON and JSONL.
5. Convert generated puzzles into the maomao level schema.
6. Export clue coordinates and complete solution rectangles.
7. Preserve upstream behavioural and differential tests.
8. Add maomao structural-quality filters.
9. Add maomao visual-quality filters.
10. Record seed, parameters, generator version and upstream commit.
11. Produce frozen level data for import into the maomao repository.

## Validation Boundary

Generator-side validation does not replace maomao validation.

After export, levels must be copied into the maomao repository and validated
using its own commands:

```bash
npm run validate:levels
npm run prebuild:check
```

This integration is out of scope for the current branch-setup phase.

## Out of Scope

- Modifying the maomao runtime.
- Direct Cocos Creator integration.
- Runtime level generation.
- WeChat Mini Game build changes.
- Replacing existing maomao levels.
- Creating a production level manifest.
- Formal difficulty calibration.
- Pet Rooms export or integration.
