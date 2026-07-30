# maomao Rectangles Candidate Generation Report

The formal offline candidate pool was generated on branch
`maomao-rect-extraction` from source commit
`a9affbf97215612342a0f825c8fe1b86c46ebace`.

## Results

| Size | Target | Accepted | Rejected/failed | Attempts |
| --- | ---: | ---: | ---: | ---: |
| 4x4 | 50 | 50 | 21 | 71 |
| 5x5 | 200 | 200 | 96 | 296 |
| 6x6 | 500 | 500 | 713 | 1,213 |
| 7x7 | 500 | 500 | 2,380 | 2,880 |
| **Total** | **1,250** | **1,250** | **3,210** | **4,460** |

All 1,250 accepted records passed the standalone structural validator, and one
fixed-seed repeat sample per size produced the same fingerprint. The pool uses
JSON and JSONL outputs, records the source commit and seed, and keeps all
levels at `difficulty.tier = unrated` and `difficulty.score = 0`.

The provisional filters rejected 3,164 extreme-aspect candidates, 62 batches
with too many long-thin regions, 60 all-edge-clue candidates, 4 all-horizontal
partitions, and 2 all-vertical partitions. These are candidate-pool filters,
not formal difficulty or renderer acceptance.

Generated files are local artifacts under the ignored
`output/maomao-rect/` directory. The maomao runtime integration, data import,
visual QA, device QA, and production numbering remain out of scope.
