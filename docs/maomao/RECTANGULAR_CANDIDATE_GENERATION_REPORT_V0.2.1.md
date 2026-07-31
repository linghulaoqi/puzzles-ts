# maomao Rectangular Candidate Generation Report V0.2.1

## 1. Source

- Repository: `linghulaoqi/puzzles-ts`
- Branch: `maomao-rect-extraction`
- Starting commit: `2ebd553081c5ec2b74c88206f103349c216ed8e7`
- Final generation commit: `27554b9ec39b66941d62a28b0a7c957b05d44aa6`
- Generator: existing deterministic Rectangles generator through `tools/maomao-rect`
- Quality config version: `PROVISIONAL_RECTANGULAR_QUALITY_FILTERS_V0.1`

The candidate content is locked to the final generation commit above. The pool
lock and this report are later documentation-only commits and do not alter
candidate content.

## 2. Supported Production Sizes

| Size | Width | Height | Status |
| --- | ---: | ---: | --- |
| 4x6 | 4 | 6 | PASS |
| 5x7 | 5 | 7 | PASS |
| 5x8 | 5 | 8 | PASS |
| 6x9 | 6 | 9 | PASS |
| 7x10 | 7 | 10 | PASS |
| 8x12 | 8 | 12 | PASS |

Width is always columns and height is always rows. Rotated sizes are not
silently mapped to a production configuration.

## 3. Smoke Validation

- Smoke generated: 18
- Smoke passed: 18
- Determinism samples: 12
- Determinism matches: 12
- Compared fields: `desc`, `aux`, `clues`, `solutionRegions`, and `fingerprint`

## 4. Candidate Pool

| Size | Target | Attempts | Accepted | Rejected | Duplicates | Failed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 4x6 | 100 | 106 | 100 | 6 | 0 | 0 |
| 5x7 | 200 | 201 | 200 | 1 | 0 | 0 |
| 5x8 | 250 | 250 | 250 | 0 | 0 | 0 |
| 6x9 | 350 | 350 | 350 | 0 | 0 | 0 |
| 7x10 | 400 | 400 | 400 | 0 | 0 | 0 |
| 8x12 | 500 | 500 | 500 | 0 | 0 | 0 |
| **Total** | **1800** | **1807** | **1800** | **7** | **0** | **0** |

The complete candidate pool remains under the ignored directory
`output/maomao-rect-rectangular-v0.2.1/`. It is not committed to Git and is not
imported into Cocos assets.

## 5. Structural Validation

- Records validated: 1,800
- Records passed: 1,800
- Records failed: 0
- Exact duplicates: 0
- Width/height reversals: 0
- Candidate repeat samples: 60
- Candidate repeat matches: 60
- Unique mode: requested for every candidate

## 6. Quality Filters

- Configuration version: `PROVISIONAL_RECTANGULAR_QUALITY_FILTERS_V0.1`
- Filters classified as provisional: YES
- Main rejection reasons: `ALL_CLUES_ON_EDGE` (4) and `ALL_REGIONS_VERTICAL` (3)
- Overall acceptance rate: 1,800 / 1,807 (99.61%)
- 4x6 acceptance rate: 100 / 106 (94.34%)
- 5x7 acceptance rate: 200 / 201 (99.50%)
- 5x8, 6x9, 7x10, and 8x12 acceptance rate: 100%

Universal structural, uniqueness, singleton, long-thin, all-horizontal,
all-vertical, and all-edge-clue rejection rules remain active.

## 7. maomao Compatibility

- Repository: `linghulaoqi/maomao`
- Branch: `rectangular-board-sizes-v0.2.1`
- Starting commit: `119529d0dd641b738419f52b978ec080e7bbb7d7`
- Validation commit: `23712d88a9076c9f90133cb2ba5ec627e921c04d`
- Production size whitelist: 4x6, 5x7, 5x8, 6x9, 7x10, 8x12
- Legacy test sizes retained: 4x4 and 5x5
- Fixed generated fixtures: 12, with two per production size
- LevelValidator: PASS
- BoardModel tests: PASS
- RuleEngine tests: PASS
- Rotated sizes rejected: PASS
- Formal manifest legacy-size gate: PASS
- `typecheck`: PASS
- Tests: 136 / 136 PASS
- `validate:levels`: 2 / 2 PASS
- `build-check`: PASS
- `prebuild:check`: PASS

The 12 fixed fixtures remain under `tests/fixtures` and are not referenced by
`assets/levels/manifest.json`.

## 8. Layout Specification

- Document: `maomao/docs/RECTANGULAR_BOARD_LAYOUT_SPEC_V0.2.1.md`
- Target viewport: 390x844 portrait
- Square cell rule: REQUIRED
- Smallest expected cell size: 42.75 logical pixels for 8x12
- 8x12 readability risk: requires Cocos Creator and real-device visual acceptance
- UI implemented during this phase: NO

## 9. Existing Square Candidate Pool

- Preserved: YES
- Existing files observed: 1,272
- Deleted: NO
- Modified: NO
- Used as formal pool: NO
- Regenerated: NO

## 10. Known puzzles-ts Baseline Issue

- Repository-wide typecheck: FAILS on unrelated pre-existing repository issues
- `catalog.json`: missing
- `emcc-runtime`: missing
- Other existing TypeScript failures: present outside `tools/maomao-rect`
- Fixed during this phase: NO
- Hook bypassed: YES
- Reason: unrelated repository-wide baseline typecheck failure
- Targeted maomao typecheck: PASS
- Targeted maomao tests: 29 / 29 PASS
- Rectangles regression tests: 32 / 32 PASS

On Windows, the first exact `npm run test:run` wrapper invocation could not
locate `sh`. Git's installed `sh.exe` was added to that command's process-local
`PATH`; the wrapper then completed with all 32 Rectangles tests passing.

## 11. Scope Confirmation

- Formal numbering implemented: NO
- Chapter ordering implemented: NO
- Final difficulty implemented: NO
- Formal manifest imported: NO
- Runtime generation implemented: NO
- Cocos gameplay UI modified: NO
- WeChat build performed: NO
- Pet Rooms considered: NO

## 12. Final Status

ACCEPTED — SIX RECTANGULAR SIZES SUPPORTED AND 1,800 CANDIDATES GENERATED
