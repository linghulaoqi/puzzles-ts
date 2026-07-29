# Pet Rooms Rectangles Extraction Branch

## Purpose

This branch is used to adapt the native TypeScript Rectangles generator for the
Pet Rooms offline level-production pipeline.

## Branch Policy

- `main` remains an unmodified mirror of `yoniLavi/puzzles-ts`.
- Pet Rooms-specific work must not be committed to `main`.
- This branch may contain CLI tools, JSON exporters, adapters, filters and tests.
- The Godot runtime must not depend directly on this repository.
- Generated and approved levels will eventually be exported as frozen JSON data.

## Upstream

- Repository: https://github.com/yoniLavi/puzzles-ts
- Base commit: `388d8ce17b253c84a41c72e5fd39c7ec31a39419`
- License: MIT

## Planned Scope

1. Extract the minimum Rectangles generator dependency set.
2. Add deterministic batch generation by seed.
3. Export Pet Rooms JSON and JSONL.
4. Preserve upstream differential tests.
5. Add Pet Rooms structural and visual-quality filters.
6. Keep all Pet Rooms changes isolated from upstream `main`.
