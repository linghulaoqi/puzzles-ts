# maomao Formal Selection Report V0.3

- Candidate pool: `maomao-rectangular-v0.2.1`
- Generator commit: `27554b9ec39b66941d62a28b0a7c957b05d44aa6`
- Pool manifest SHA-256: `87240db3db64fcd571916c6a373433491d1a589bad625a06da471fe02029093f`
- Candidates analyzed: 1800
- Logical solved: 1795
- Logical stalled: 5
- Unique solutions: 1800 / 1800
- Formal selected: 100
- Reserve selected: 100
- Similarity threshold: 0.92
- Near-duplicate decisions: 0
- Exact duplicates: 0
- Formal/reserve overlap: 0
- Quantile fallbacks: 0
- Major difficulty reversals: 0
- Full-pool raw difficulty standard deviation: 206.995125
- Difficulty classification: PROVISIONAL V0.1
- Human-calibrated difficulty: NO
- Quality relaxation used: NO; every size completed within the top 70 percent quality set
- Repeated output: 208 / 208 relative files byte-identical
- Determinism result: PASS

| Size | Formal | Reserve | Maximum quality fraction used |
| --- | ---: | ---: | ---: |
| 4x6 | 15 | 15 | 0.7 |
| 5x7 | 20 | 20 | 0.7 |
| 5x8 | 20 | 20 | 0.7 |
| 6x9 | 20 | 20 | 0.7 |
| 7x10 | 15 | 15 | 0.7 |
| 8x12 | 10 | 10 | 0.7 |

## Difficulty ranges in the formal set

| Size | Raw score range |
| --- | ---: |
| 4x6 | 229-246 |
| 5x7 | 325-345 |
| 5x8 | 369-389 |
| 6x9 | 488-515 |
| 7x10 | 623-652 |
| 8x12 | 853-873 |

The exported product score is the deterministic order from 1 through 100. Product tiers are `easy` for 1-30, `medium` for 31-80, and `hard` for 81-100. Runtime JSON contains no seed, fingerprint, quality, solver, or selection-audit fields.

## Validation

- maomao Rectangles typecheck: PASS
- Analyzer and formal-selector tests: 54 / 54 PASS
- Original Rectangles regression tests: 32 / 32 PASS
- Formal verifier: 100 formal, 100 reserve, 100 manifest references, 0 exact duplicates, 0 near duplicates, 0 overlap, 0 major reversals

The difficulty and similarity models remain explicitly provisional pending human play calibration. No Rectangles core generation behavior was changed and the 1,800-candidate source pool was not regenerated.
