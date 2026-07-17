import "./styles.css";
import { hardMatrix } from "./example-matrix";
import { dispatchAction, parseGridCoordinates } from "./interaction";
import { moveStep, playbackDelay } from "./player";
import {
  algorithmLines,
  type BinaryCell,
  generateMaximalSquareTrace,
  type SquareBounds,
  type TracePhase,
  type TraceStep,
} from "./trace";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("#app was not found");

const matrix: BinaryCell[][] = hardMatrix.map((row) => [...row]);
let trace = generateMaximalSquareTrace(matrix);
let stepIndex = 0;
let speed = 1;
let isPlaying = false;
let timer: number | null = null;

const phaseLabels: Record<TracePhase, string> = {
  init: "Инициализация",
  "row-start": "Новая строка",
  capture: "Сохраняем top",
  compute: "Вычисляем dp",
  record: "Новый максимум",
  commit: "Сдвигаем diagonal",
  "row-complete": "Строка готова",
  complete: "Ответ",
};

const currentStep = (): TraceStep => {
  const step = trace.steps[stepIndex] ?? trace.steps[0];
  if (!step) throw new Error("The generated trace contains no steps");
  return step;
};
const lastStepIndex = (): number => Math.max(0, trace.steps.length - 1);

const inBounds = (bounds: SquareBounds | null, row: number, col: number): boolean =>
  Boolean(bounds && row >= bounds.top && row <= bounds.bottom && col >= bounds.left && col <= bounds.right);

const candidateBounds = (step: TraceStep): SquareBounds | null => {
  if ((step.phase !== "compute" && step.phase !== "record") || step.row === null || step.col === null || !step.nextValue || step.nextValue < 2) {
    return null;
  }

  return {
    top: step.row - step.nextValue + 1,
    left: step.col - step.nextValue + 1,
    bottom: step.row,
    right: step.col,
    size: step.nextValue,
  };
};

const isProcessed = (step: TraceStep, row: number, col: number): boolean => {
  if (step.phase === "complete") return true;
  if (step.row === null) return false;
  if (row < step.row) return true;
  if (row > step.row || step.col === null) return false;
  return col < step.col || (col === step.col && step.phase !== "capture");
};

const roleForCell = (step: TraceStep, row: number, col: number): { className: string; label: string } | null => {
  if (step.row === null || step.col === null) return null;
  if (row === step.row && col === step.col) return { className: "is-current", label: "NOW" };

  const showsDependencies = step.phase === "capture" || step.phase === "compute" || step.phase === "record";
  if (!showsDependencies || step.row === 0 || step.col === 0) return null;
  if (row === step.row - 1 && col === step.col) return { className: "role-top", label: "TOP" };
  if (row === step.row && col === step.col - 1) return { className: "role-left", label: "LEFT" };
  if (row === step.row - 1 && col === step.col - 1) return { className: "role-diagonal", label: "DIAG" };
  return null;
};

const renderMatrix = (step: TraceStep): string => {
  const candidate = candidateBounds(step);
  const cells = matrix
    .flatMap((row, rowIndex) =>
      row.map((cell, colIndex) => {
        const role = roleForCell(step, rowIndex, colIndex);
        const classes = [
          "matrix-cell",
          cell === "1" ? "is-one" : "is-zero",
          role?.className ?? "",
          isProcessed(step, rowIndex, colIndex) ? "is-processed" : "",
          inBounds(step.square, rowIndex, colIndex) ? "in-best-square" : "",
          inBounds(candidate, rowIndex, colIndex) ? "in-candidate-square" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return `<button
          class="${classes}"
          type="button"
          data-action="toggle-cell"
          data-row="${rowIndex}"
          data-col="${colIndex}"
          aria-label="Ячейка ${rowIndex}, ${colIndex}: ${cell}. Изменить на ${cell === "1" ? "0" : "1"}"
          title="Клик: изменить ${cell} на ${cell === "1" ? "0" : "1"} и начать заново"
          ${isPlaying ? "disabled" : ""}
        >
          ${role ? `<span class="cell-role">${role.label}</span>` : ""}
          <span class="cell-value">${cell}</span>
        </button>`;
      }),
    )
    .join("");

  const columnLabels = Array.from({ length: trace.cols }, (_, col) => `<span class="axis-label">c${col}</span>`).join("");
  const rowLabels = Array.from({ length: trace.rows }, (_, row) => `<span class="axis-label">r${row}</span>`).join("");

  return `
    <div class="matrix-wrap" style="--cols:${trace.cols}; --rows:${trace.rows}">
      <div class="column-labels">${columnLabels}</div>
      <div class="row-labels">${rowLabels}</div>
      <div class="matrix-grid">${cells}</div>
    </div>
    <div class="legend" aria-label="Легенда подсветки">
      <span class="legend-item legend-current"><i class="legend-dot"></i>current</span>
      <span class="legend-item legend-top"><i class="legend-dot"></i>top</span>
      <span class="legend-item legend-left"><i class="legend-dot"></i>left</span>
      <span class="legend-item legend-diagonal"><i class="legend-dot"></i>diagonal</span>
      <span class="legend-item legend-best"><i class="legend-dot"></i>лучший квадрат</span>
    </div>
    <p class="edit-hint">Пауза → клик по ячейке меняет 0 ↔ 1 и строит новый trace</p>
  `;
};

const renderDp = (step: TraceStep): string =>
  step.dp
    .map(
      (value, index) => `
        <div class="dp-cell ${step.col === index ? "active" : ""}">
          <small>dp[${index}]</small>
          <strong>${value}</strong>
        </div>`,
    )
    .join("");

const valueText = (value: number | string | null): string => (value === null ? "—" : String(value));

const playButtonLabel = (final: boolean): string => {
  if (isPlaying) return "Пауза";
  if (final) return "Сначала";
  return "Запустить";
};

const renderVariables = (step: TraceStep): string => {
  const currentDp = step.col === null ? null : (step.dp[step.col] ?? null);
  const variables = [
    { label: "row / r", value: step.row, role: "" },
    { label: "column / c", value: step.col, role: "" },
    { label: "matrix[r][c]", value: step.cell, role: "role-current" },
    { label: "temp", value: step.temp, role: "" },
    { label: "prev", value: step.prev, role: "role-diagonal" },
    { label: "top", value: step.top, role: "role-top" },
    { label: "left", value: step.left, role: "role-left" },
    { label: "diagonal", value: step.diagonal, role: "role-diagonal" },
    { label: "old dp[c]", value: step.previousValue, role: "" },
    { label: "new dp[c]", value: currentDp, role: "role-current" },
    { label: "maxSide", value: step.maxSide, role: "role-success" },
    { label: "area", value: step.maxSide * step.maxSide, role: "role-success" },
  ];

  return variables
    .map(
      ({ label, value, role }) => `
        <div class="variable-card ${role}">
          <span>${label}</span>
          <strong>${valueText(value)}</strong>
        </div>`,
    )
    .join("");
};

const renderCode = (step: TraceStep): string =>
  algorithmLines
    .map(
      (line, index) => `
        <div class="code-line ${index + 1 === step.codeLine ? "active" : ""}" data-code-line="${index + 1}">
          <span class="code-line-number">${String(index + 1).padStart(2, "0")}</span>
          <span>${line.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;") || " "}</span>
        </div>`,
    )
    .join("");

const render = (): void => {
  const step = currentStep();
  const progress = lastStepIndex() === 0 ? 100 : (stepIndex / lastStepIndex()) * 100;
  const position = step.row === null || step.col === null ? "—" : `[${step.row}][${step.col}]`;
  const final = step.phase === "complete";
  const visibleDp = step.col === null ? null : (step.dp[step.col] ?? null);
  const metricValue = final ? String(trace.result.area) : valueText(visibleDp);
  const playbackLabel = playButtonLabel(final);

  root.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <div class="brand-mark">M²</div>
          <div>
            <p class="eyebrow">Algorithm Lab · Dynamic Programming</p>
            <h1>Maximal Square, но вживую</h1>
          </div>
        </div>
        <div class="header-result" aria-label="Текущий результат">
          <i class="live-dot"></i>
          <div class="header-stat"><span>позиция</span><strong>${position}</strong></div>
          <div class="header-stat"><span>сторона</span><strong>${step.maxSide}</strong></div>
          <div class="header-stat"><span>площадь</span><strong>${step.maxSide * step.maxSide}</strong></div>
        </div>
      </header>

      <div class="progress-rail" aria-label="Прогресс алгоритма">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>

      <div class="workspace">
        <section class="primary-column">
          <article class="panel">
            <header class="panel-header">
              <div class="panel-title-wrap">
                <p class="panel-kicker">Runtime view</p>
                <h2>Матрица ${trace.rows}×${trace.cols}</h2>
              </div>
              <span class="step-pill">кадр ${stepIndex + 1} / ${trace.steps.length}</span>
            </header>
            <div class="matrix-stage">${renderMatrix(step)}</div>
            <div class="dp-section">
              <div class="dp-heading">
                <strong>DP-полоска памяти</strong>
                <span>вместо полной таблицы rows × cols</span>
              </div>
              <div class="dp-strip" style="--cols:${trace.cols}">${renderDp(step)}</div>
            </div>
          </article>

          <article class="panel">
            <div class="narration-panel">
              <div class="narration-copy">
                <span class="phase-pill">${phaseLabels[step.phase]}</span>
                <h2>${step.title}</h2>
                <p>${step.explanation}</p>
              </div>
              <div class="narration-metric">
                <span>${final ? "финальный ответ" : "текущий dp[c]"}</span>
                <strong>${metricValue}</strong>
              </div>
            </div>
            <div class="controls">
              <div class="transport">
                <button class="control-button" type="button" data-action="reset" title="Сначала (Home)" aria-label="Сначала">↺</button>
                <button class="control-button" type="button" data-action="previous" ${stepIndex === 0 ? "disabled" : ""} title="Шаг назад (←)" aria-label="Шаг назад">←</button>
                <button class="control-button primary" type="button" data-action="play" aria-label="${isPlaying ? "Пауза" : "Запустить"}">
                  ${isPlaying ? "Ⅱ" : "▶"}<span class="button-label">${playbackLabel}</span>
                </button>
                <button class="control-button" type="button" data-action="next" ${stepIndex === lastStepIndex() ? "disabled" : ""} title="Шаг вперёд (→)" aria-label="Шаг вперёд">→</button>
                <button class="control-button" type="button" data-action="finish" ${stepIndex === lastStepIndex() ? "disabled" : ""} title="В конец (End)" aria-label="В конец">⇥</button>
              </div>
              <div class="speed-control" aria-label="Скорость воспроизведения">
                <span class="speed-label">скорость</span>
                ${[0.5, 1, 2, 4]
                  .map(
                    (value) => `<button class="speed-button ${speed === value ? "active" : ""}" type="button" data-action="speed" data-speed="${value}">${value}×</button>`,
                  )
                  .join("")}
              </div>
            </div>
          </article>
        </section>

        <aside class="inspector-column">
          <article class="panel code-panel">
            <header class="panel-header">
              <div class="panel-title-wrap">
                <p class="panel-kicker">Source execution</p>
                <h3>Исполняемый TypeScript</h3>
              </div>
              <span class="step-pill">line ${step.codeLine}</span>
            </header>
            <div class="code-scroller" data-code-scroller>
              <div class="code-list">${renderCode(step)}</div>
            </div>
          </article>

          <article class="panel">
            <header class="panel-header">
              <div class="panel-title-wrap">
                <p class="panel-kicker">Memory inspector</p>
                <h3>Переменные прямо сейчас</h3>
              </div>
            </header>
            <div class="variable-grid">${renderVariables(step)}</div>
            <div class="invariant">
              <span class="invariant-label">Главный инвариант</span>
              <p><code>dp[c]</code> — сторона самого большого квадрата из единиц, который <strong>заканчивается</strong> в текущей ячейке <code>[r][c]</code>.</p>
            </div>
          </article>

          <article class="panel">
            <header class="panel-header">
              <div class="panel-title-wrap">
                <p class="panel-kicker">Mental model</p>
                <h3>Почему это работает</h3>
              </div>
            </header>
            <div class="concept-grid">
              <div class="concept-card"><strong>Почему min?</strong><p>Квадрат можно расширить только настолько, насколько позволяет самое слабое из трёх соседних направлений.</p></div>
              <div class="concept-card"><strong>Зачем temp?</strong><p><code>dp[c]</code> скоро перезапишется. <code>temp</code> спасает старый top для следующей диагонали.</p></div>
              <div class="concept-card"><strong>Почему O(cols)?</strong><p>Для новой строки нужна только предыдущая строка DP, поэтому полная таблица не требуется.</p></div>
            </div>
            <div class="shortcut-row">
              <span class="shortcut"><kbd class="key-hint">Space</kbd> play / pause</span>
              <span class="shortcut"><kbd class="key-hint">← →</kbd> шаг</span>
              <span class="shortcut"><kbd class="key-hint">Home</kbd> сначала</span>
              <span class="shortcut"><kbd class="key-hint">End</kbd> ответ</span>
            </div>
          </article>
        </aside>
      </div>
    </main>
  `;

  requestAnimationFrame(() => {
    const scroller = root.querySelector<HTMLElement>("[data-code-scroller]");
    const activeLine = root.querySelector<HTMLElement>(".code-line.active");
    if (scroller && activeLine) {
      const target = activeLine.offsetTop - scroller.clientHeight / 2 + activeLine.clientHeight / 2;
      scroller.scrollTop = Math.max(0, target);
    }
  });
};

const clearPlaybackTimer = (): void => {
  if (timer === null) return;
  window.clearTimeout(timer);
  timer = null;
};

const stopPlayback = (): void => {
  isPlaying = false;
  clearPlaybackTimer();
};

const scheduleNextFrame = (): void => {
  if (!isPlaying) return;
  if (stepIndex >= lastStepIndex()) {
    stopPlayback();
    render();
    return;
  }

  timer = window.setTimeout(() => {
    stepIndex = moveStep(stepIndex, 1, trace.steps.length);
    render();
    scheduleNextFrame();
  }, playbackDelay(speed));
};

const startPlayback = (): void => {
  if (stepIndex >= lastStepIndex()) stepIndex = 0;
  isPlaying = true;
  render();
  scheduleNextFrame();
};

const goToStep = (nextIndex: number): void => {
  stopPlayback();
  stepIndex = Math.min(lastStepIndex(), Math.max(0, nextIndex));
  render();
};

const rebuildTrace = (): void => {
  stopPlayback();
  trace = generateMaximalSquareTrace(matrix);
  stepIndex = 0;
  render();
};

const togglePlayback = (): void => {
  if (!isPlaying) {
    startPlayback();
    return;
  }

  stopPlayback();
  render();
};

const allowedSpeeds = new Set([0.5, 1, 2, 4]);

const selectSpeed = (target: HTMLElement): void => {
  const nextSpeed = Number(target.dataset.speed);
  if (!allowedSpeeds.has(nextSpeed)) return;

  speed = nextSpeed;
  if (isPlaying) {
    clearPlaybackTimer();
    render();
    scheduleNextFrame();
    return;
  }

  render();
};

const toggleCell = (target: HTMLElement): void => {
  if (isPlaying) return;

  const coordinates = parseGridCoordinates(target.dataset.row, target.dataset.col, matrix.length, matrix[0]?.length ?? 0);
  if (!coordinates) return;

  const row = matrix[coordinates.row];
  if (!row) return;

  const current = row[coordinates.col];
  if (current === undefined) return;

  row[coordinates.col] = current === "1" ? "0" : "1";
  rebuildTrace();
};

type ClickAction = (target: HTMLElement) => void;

const clickActions = new Map<string, ClickAction>([
  ["finish", () => goToStep(lastStepIndex())],
  ["next", () => goToStep(moveStep(stepIndex, 1, trace.steps.length))],
  ["play", togglePlayback],
  ["previous", () => goToStep(moveStep(stepIndex, -1, trace.steps.length))],
  ["reset", () => goToStep(0)],
  ["speed", selectSpeed],
  ["toggle-cell", toggleCell],
]);

const handleRootClick = (event: MouseEvent): void => {
  if (!(event.target instanceof Element)) return;

  const target = event.target.closest<HTMLElement>("[data-action]");
  if (!target) return;

  dispatchAction(clickActions, target.dataset.action, target);
};

root.addEventListener("click", handleRootClick);

window.addEventListener("keydown", (event) => {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;

  if (event.code === "Space") {
    event.preventDefault();
    if (isPlaying) {
      stopPlayback();
      render();
    } else {
      startPlayback();
    }
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToStep(moveStep(stepIndex, -1, trace.steps.length));
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    goToStep(moveStep(stepIndex, 1, trace.steps.length));
  }
  if (event.key === "Home") {
    event.preventDefault();
    goToStep(0);
  }
  if (event.key === "End") {
    event.preventDefault();
    goToStep(lastStepIndex());
  }
});

render();
