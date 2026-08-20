# maomao Formal Selection Report V0.4

## Reordering result

- Existing formal candidate set retained: 100 / 100
- Candidates added or removed: 0
- Runtime slots whose candidate changed: 69 / 100
- Formal ID range retained: `main_001` through `main_100`
- Chapters retained: 10 chapters, 10 levels each
- Board-size quotas retained: 15 / 20 / 20 / 20 / 15 / 10
- Runtime content version: 2

V0.4 keeps the V0.3 size and difficulty-quantile progression, then orders levels inside each size and quantile by `PROVISIONAL_PROGRESSION_MODEL_V0.2`:

```text
logicalActions
+ candidateEliminations * 0.25
+ branchCount * 4
+ backtrackCount * 1.5
+ maximumSearchDepth * 0.25
```

This is a deterministic ordering model, not a human-calibrated difficulty claim.

## Progression comparison

| Metric | V0.3 | V0.4 |
| --- | ---: | ---: |
| Same-size, same-quantile effort inversions | 33 | 0 |
| Sum of inversion drops | 339.5 | 0 |
| Within-size adjacent effort variation | 1053.5 | 601.25 |
| Adjacent clue-count variation | 190 | 187 |
| Maximum adjacent clue-count jump | 8 | 8 |

The 42.93 percent reduction in within-size adjacent effort variation is the main progression improvement. Board-size transitions remain intentional and are not treated as reorderable boundaries.

## Selection and provenance

- Candidate pool: `maomao-rectangular-v0.2.1`
- Generator commit: `27554b9ec39b66941d62a28b0a7c957b05d44aa6`
- Pool manifest SHA-256: `87240db3db64fcd571916c6a373433491d1a589bad625a06da471fe02029093f`
- V0.4 formal mapping SHA-256: `a56232a923895152f43ef435fb82d73770e9653d747292c6d7a688fd19a21970`
- Candidates analyzed: 1,800
- Formal selected: 100
- Reserve selected: 100
- Unique solutions in formal set: 100 / 100
- Exact duplicates: 0
- Near duplicates at threshold 0.92: 0
- Formal/reserve overlap: 0
- Quantile fallbacks: 0
- Major difficulty reversals: 0

## Generator validation

- maomao Rectangles typecheck: PASS
- Analyzer, selector, exporter, and verifier tests: 56 / 56 PASS
- Original Rectangles regression tests: 32 / 32 PASS
- Formal verifier: PASS
- maomao runtime tests: 313 / 313 PASS
- maomao formal level validation: 100 / 100 PASS
- maomao build check: PASS
- Human play calibration: NOT RUN

No Rectangles generation behavior changed, the 1,800-candidate pool was not regenerated, and no reserve candidate replaced a formal candidate.
