# Rectangles Dependency Audit for maomao

## Generator Entry Point

The reusable entry point is `src/native/games/rect/generator.ts:newDesc`.
The maomao offline pipeline calls it with `RectParams` and a seeded
`RandomState` from `src/native/random/index.ts:randomNew`.

## Required Parameters

The minimum parameter set is:

- `w`: positive board width
- `h`: positive board height
- `expandfactor`: `0` for the candidate pool
- `unique`: `true`, so the upstream generator rejects non-uniquely-solvable
  partitions before placing clues

For a fixed parameter object and seed, the generator produces the same `desc`
and `aux` values. The candidate CLI records the seed and all parameters.

## Random Seed Entry

Seeds enter through `randomNew(seed)`. The pipeline uses stable textual seeds
such as `maomao-5x5-000001`; it does not use `Math.random`, timestamps, UUIDs,
process IDs, or output paths.

## Generated Outputs

`newDesc` returns:

- `desc`: the run-length encoded clue grid; decode it with
  `decodeNumbers(desc, w * h)`
- `aux`: an `S` prefix followed by vertical wall bits in row-major order and
  horizontal wall bits in row-major order

The exporter converts these native values into maomao `clues` and complete
`solutionRegions`. Native `desc` and `aux` are retained only in offline
diagnostic records, not in the runtime export contract.

## Solution Extraction

The `aux` vertical bits are indexed as `y * (w - 1) + (x - 1)` for the wall
between `(x - 1, y)` and `(x, y)`. Horizontal bits are indexed as
`(y - 1) * w + x` for the wall between `(x, y - 1)` and `(x, y)`.

The parser flood-fills cells across absent walls. Each connected component is
then reduced to its inclusive `top`, `left`, `bottom`, and `right` bounds.
The validator verifies that every component is a rectangle, covers the board
exactly once, has exactly one clue, and has clue value equal to its area.
This extracts the complete `solutionRegions` list rather than just a sample of
edges.

## Uniqueness Guarantee

`newDesc` passes `unique: true` to the upstream Rectangles generator. The
generator invokes the native Rectangles solver and only accepts a partition
whose solve result is `SOLVE_UNIQUE`. The pipeline records this as an upstream
uniqueness guarantee and separately validates the exported structure. It does
not silently claim that a structural check alone proves uniqueness.

## Required Dependency Files

The standalone pipeline requires only:

- `src/native/games/rect/generator.ts`
- `src/native/games/rect/state.ts` (`decodeNumbers` and `RectParams`)
- `src/native/random/index.ts`
- `src/native/random/sha1.ts` through the RNG import
- the TypeScript and Vitest tooling used by the standalone configuration

## Dependencies Not Required by CLI

The CLI does not require the browser UI, Cocos Creator, Emscripten, the full
Vite build, puzzle catalog assets, `emcc-runtime`, maomao source files, or the
full repository typecheck. It also does not invoke the runtime solver as a
second generation path; uniqueness comes from the upstream generator's
`unique: true` contract.

## Risks

- A future change to the upstream generator or RNG can change candidate
  fingerprints, so the source commit is recorded in every export.
- Structural and provisional quality filters do not replace maomao renderer,
  device, or formal difficulty acceptance.
- The repository-wide TypeScript baseline currently references missing
  `assets/puzzles/catalog.json` and `emcc-runtime`; those unrelated resources
  are not repaired by this pipeline.
- Candidate numbering is provisional. Exported records use `unrated` and score
  `0` until product-side calibration.

## Recommended Integration Boundary

Run generation and approval offline in this branch, review the frozen JSON
outputs, then copy approved JSON into maomao as data. The maomao runtime should
consume only the exported schema and must not import `puzzles-ts`, generate
levels, run Node/Vitest, or parse native `desc`/`aux` strings.

