# Maximal Square Visualizer

Watch a memory-efficient dynamic programming algorithm work, one cell at a time. Edit a binary matrix, step through the TypeScript and see exactly how neighboring squares determine the next result.

[Русское руководство](README.ru.md)

## Run locally

Use [Node.js](https://nodejs.org/) `^20.19.0` or `>=22.12.0`, with npm.

```bash
git clone https://github.com/FrankFMY/maximal-square-visualizer.git
cd maximal-square-visualizer
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). Press `Ctrl+C` to stop the server.

On Windows, you can also run `START_APP.bat` from the cloned project. It installs dependencies when needed and opens the app in your browser.

## Explore the algorithm

- Play, pause, step backward/forward, or jump to the beginning and end.
- Choose playback speeds of `0.5×`, `1×`, `2×` or `4×`.
- Use `Space`, `←`, `→`, `Home` and `End` for keyboard control.
- Click a matrix cell to toggle `0 ↔ 1`.
- Follow the active TypeScript line and the values of `r`, `c`, `temp`, `prev`, `top`, `left`, `diagonal`, `dp[c]` and `maxSide`.
- Compare the square at the current cell with the largest square found so far.

## How it works

After processing `[r][c]`, `dp[c]` is the side length of the largest all-ones square whose bottom-right corner is that cell.

For a cell containing `1`:

```ts
dp[c] = Math.min(top, left, diagonal) + 1;
```

Here, `top` is the old `dp[c]`, `left` is the updated `dp[c - 1]`, and `diagonal` is `prev`. The smallest neighbor limits how far the square can grow.

Before overwriting `dp[c]`, the algorithm saves it:

```ts
const temp = dp[c];
```

After computing the new value, `prev = temp` preserves the diagonal for the next column. Each row starts with `prev = 0`.

The algorithm takes `O(rows × cols)` time and `O(cols)` auxiliary space: one DP row and a diagonal value. Empty matrices, including matrices without columns, return `0`.

The visualizer additionally stores immutable execution frames for rewind and explanations. That teaching layer uses extra memory; it is separate from the algorithm's `O(cols)` working space.

## Verification

```bash
npm run lint
npm test
npm run check
npm run build
```

Tests cover the example result (`9`), the square growing at `[3][4]`, an independent brute-force oracle for every binary matrix up to `3×3`, ragged-input rejection, UI action allowlists, coordinate bounds, player transitions and playback timing.

The production build is written to `dist/`. Run `npm run preview` to inspect it locally.

## Project map

| File | Purpose |
| --- | --- |
| `src/example-matrix.ts` | Initial `6×7` matrix |
| `src/trace.ts` | Algorithm and immutable execution frames |
| `src/interaction.ts` | UI dispatch and coordinate validation |
| `src/player.ts` | Playback transitions and timing |
| `src/main.ts` | Interface and interactions |
| `src/styles.css` | Responsive presentation |
| `src/*.test.ts` | Algorithm, interaction and player tests |

## Author and contact

**Artem Prianishnikov** · [FrankFMY](https://github.com/FrankFMY)

[Website](https://frankfmy.com) · [Telegram](https://t.me/FrankFMY) · [LinkedIn](https://www.linkedin.com/in/frankfmy/) · [X](https://x.com/FrankFMY) · [npm profile](https://www.npmjs.com/~frankfmy)

Email: [frankfmy@proton.me](mailto:frankfmy@proton.me) · [Pryanishnikovartem@gmail.com](mailto:Pryanishnikovartem@gmail.com)

## License

[MIT](LICENSE). The original copyright notice is preserved under the author's earlier public name, Artie Frank.
