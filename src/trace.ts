export type BinaryCell = "0" | "1";
export type BinaryMatrix = readonly (readonly BinaryCell[])[];

export type TracePhase =
  | "init"
  | "row-start"
  | "capture"
  | "compute"
  | "record"
  | "commit"
  | "row-complete"
  | "complete";

export interface SquareBounds {
  top: number;
  left: number;
  bottom: number;
  right: number;
  size: number;
}

export interface TraceStep {
  id: number;
  phase: TracePhase;
  codeLine: number;
  title: string;
  explanation: string;
  row: number | null;
  col: number | null;
  cell: BinaryCell | null;
  dp: number[];
  prev: number;
  temp: number | null;
  top: number | null;
  left: number | null;
  diagonal: number | null;
  previousValue: number | null;
  nextValue: number | null;
  maxSide: number;
  square: SquareBounds | null;
}

export interface MaximalSquareTrace {
  matrix: BinaryCell[][];
  rows: number;
  cols: number;
  steps: TraceStep[];
  result: {
    maxSide: number;
    area: number;
  };
}

export const algorithmLines = [
  "function maximalSquare(matrix: string[][]): number {",
  "  if (!matrix.length || !matrix[0]?.length) {",
  "    return 0;",
  "  }",
  "",
  "  const rows = matrix.length;",
  "  const cols = matrix[0].length;",
  "  let maxSide = 0;",
  "  const dp = new Array(cols).fill(0);",
  "",
  "  for (let r = 0; r < rows; r++) {",
  "    let prev = 0; // диагональ для новой строки пуста",
  "",
  "    for (let c = 0; c < cols; c++) {",
  "      const temp = dp[c]; // старое значение сверху",
  "",
  "      if (matrix[r][c] === '1') {",
  "        if (r === 0 || c === 0) {",
  "          dp[c] = 1;",
  "        } else {",
  "          const top = dp[c];",
  "          const left = dp[c - 1];",
  "          const diagonal = prev;",
  "          dp[c] = Math.min(top, left, diagonal) + 1;",
  "        }",
  "        maxSide = Math.max(maxSide, dp[c]);",
  "      } else {",
  "        dp[c] = 0;",
  "      }",
  "      prev = temp; // переносим старый top в diagonal",
  "    }",
  "  }",
  "",
  "  return maxSide * maxSide;",
  "}",
] as const;

type StepDraft = Omit<TraceStep, "id" | "dp" | "maxSide" | "square">;
type RecordStep = (step: StepDraft) => void;

interface TraceState {
  dp: number[];
  steps: TraceStep[];
  maxSide: number;
  bestSquare: SquareBounds | null;
}

interface CellContext {
  row: number;
  col: number;
  cell: BinaryCell;
  prev: number;
  temp: number;
  top: number;
  left: number;
  diagonal: number;
  previousValue: number;
}

const assertRectangular = (input: BinaryMatrix): void => {
  const expectedColumns = input[0]?.length ?? 0;
  if (input.some((row) => row.length !== expectedColumns)) {
    throw new Error("Все строки матрицы должны иметь одинаковую длину");
  }
};

const createState = (cols: number): TraceState => ({
  dp: new Array<number>(cols).fill(0),
  steps: [],
  maxSide: 0,
  bestSquare: null,
});

const createRecorder = (state: TraceState): RecordStep => (step) => {
  state.steps.push({
    ...step,
    id: state.steps.length,
    dp: [...state.dp],
    maxSide: state.maxSide,
    square: state.bestSquare ? { ...state.bestSquare } : null,
  });
};

const recordInitialStep = (record: RecordStep, cols: number): void => {
  const empty = cols === 0;
  record({
    phase: "init",
    codeLine: empty ? 2 : 9,
    title: empty ? "Пустая матрица" : "Подготавливаем память",
    explanation: empty
      ? "В матрице нет ячеек, поэтому площадь максимального квадрата равна 0."
      : `Создаём DP-полоску длиной ${cols}. dp[c] будет хранить сторону самого большого квадрата, который заканчивается в текущей ячейке столбца c.`,
    row: null,
    col: null,
    cell: null,
    prev: 0,
    temp: null,
    top: null,
    left: null,
    diagonal: null,
    previousValue: null,
    nextValue: null,
  });
};

const recordRowStart = (record: RecordStep, row: number): void => {
  record({
    phase: "row-start",
    codeLine: 12,
    title: `Начинаем строку ${row}`,
    explanation: "Сбрасываем prev в 0: слева от первого столбца нет диагональной ячейки.",
    row,
    col: null,
    cell: null,
    prev: 0,
    temp: null,
    top: null,
    left: null,
    diagonal: null,
    previousValue: null,
    nextValue: null,
  });
};

const createCellContext = (
  matrix: BinaryCell[][],
  state: TraceState,
  row: number,
  col: number,
  prev: number,
): CellContext => {
  const previousValue = state.dp[col] ?? 0;
  return {
    row,
    col,
    cell: matrix[row]?.[col] ?? "0",
    prev,
    temp: previousValue,
    top: previousValue,
    left: col > 0 ? (state.dp[col - 1] ?? 0) : 0,
    diagonal: prev,
    previousValue,
  };
};

const cellDetails = (context: CellContext, nextValue: number, prev = context.prev) => ({
  row: context.row,
  col: context.col,
  cell: context.cell,
  prev,
  temp: context.temp,
  top: context.top,
  left: context.left,
  diagonal: context.diagonal,
  previousValue: context.previousValue,
  nextValue,
});

const recordCapture = (record: RecordStep, context: CellContext): void => {
  record({
    phase: "capture",
    codeLine: 15,
    title: `Сохраняем старый dp[${context.col}]`,
    explanation: `temp = ${context.temp}. Это старое значение сверху; после перезаписи dp[${context.col}] оно понадобится как диагональ для следующего столбца.`,
    ...cellDetails(context, context.previousValue),
  });
};

const nextSquareSide = (context: CellContext): number => {
  if (context.row === 0 || context.col === 0) return 1;
  return Math.min(context.top, context.left, context.diagonal) + 1;
};

const updateBestSquare = (state: TraceState, context: CellContext, nextValue: number): void => {
  state.maxSide = nextValue;
  state.bestSquare = {
    top: context.row - nextValue + 1,
    left: context.col - nextValue + 1,
    bottom: context.row,
    right: context.col,
    size: nextValue,
  };
};

const recordNewMaximum = (
  state: TraceState,
  record: RecordStep,
  context: CellContext,
  nextValue: number,
): void => {
  if (nextValue <= state.maxSide) return;

  updateBestSquare(state, context, nextValue);
  record({
    phase: "record",
    codeLine: 26,
    title: `Новый рекорд: сторона ${state.maxSide}`,
    explanation: `maxSide становится ${state.maxSide}, поэтому текущая максимальная площадь равна ${state.maxSide} × ${state.maxSide} = ${state.maxSide * state.maxSide}.`,
    ...cellDetails(context, nextValue),
  });
};

const processOneCell = (state: TraceState, record: RecordStep, context: CellContext): void => {
  if (context.cell === "0") {
    state.dp[context.col] = 0;
    record({
      phase: "compute",
      codeLine: 28,
      title: "Ноль обрывает квадрат",
      explanation: `В matrix[${context.row}][${context.col}] лежит 0, поэтому квадрат из единиц здесь закончиться не может. Сбрасываем dp[${context.col}] в 0.`,
      ...cellDetails(context, 0),
    });
    return;
  }

  const edge = context.row === 0 || context.col === 0;
  const nextValue = nextSquareSide(context);
  state.dp[context.col] = nextValue;
  record({
    phase: "compute",
    codeLine: edge ? 19 : 24,
    title: nextValue > 1 ? `Квадрат растёт до ${nextValue}×${nextValue}` : "Здесь начинается квадрат 1×1",
    explanation: edge
      ? "Ячейка лежит на краю: квадрат большего размера закончиться здесь не может, поэтому записываем 1."
      : `Берём минимум из top=${context.top}, left=${context.left}, diagonal=${context.diagonal} и прибавляем 1. Получаем ${nextValue}.`,
    ...cellDetails(context, nextValue),
  });
  recordNewMaximum(state, record, context, nextValue);
};

const recordCommit = (state: TraceState, record: RecordStep, context: CellContext): number => {
  record({
    phase: "commit",
    codeLine: 30,
    title: "Передвигаем диагональ вправо",
    explanation: `prev = temp = ${context.temp}. На следующем столбце это значение будет обозначать верхнюю левую диагональ.`,
    ...cellDetails(context, state.dp[context.col] ?? 0, context.temp),
  });
  return context.temp;
};

const recordRowComplete = (
  state: TraceState,
  record: RecordStep,
  row: number,
  prev: number,
): void => {
  record({
    phase: "row-complete",
    codeLine: 31,
    title: `Строка ${row} обработана`,
    explanation: `DP-полоска после строки ${row}: [${state.dp.join(", ")}]. Переходим к следующей строке.`,
    row,
    col: null,
    cell: null,
    prev,
    temp: null,
    top: null,
    left: null,
    diagonal: null,
    previousValue: null,
    nextValue: null,
  });
};

const recordComplete = (state: TraceState, record: RecordStep): void => {
  const area = state.maxSide * state.maxSide;
  record({
    phase: "complete",
    codeLine: 34,
    title: `Готово: площадь ${area}`,
    explanation: `Максимальная сторона равна ${state.maxSide}. Возвращаем ${state.maxSide} × ${state.maxSide} = ${area}.`,
    row: null,
    col: null,
    cell: null,
    prev: 0,
    temp: null,
    top: null,
    left: null,
    diagonal: null,
    previousValue: null,
    nextValue: null,
  });
};

export const generateMaximalSquareTrace = (input: BinaryMatrix): MaximalSquareTrace => {
  assertRectangular(input);

  const matrix = input.map((row) => [...row]);
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const state = createState(cols);
  const record = createRecorder(state);

  recordInitialStep(record, cols);
  for (let row = 0; row < rows; row += 1) {
    let prev = 0;
    recordRowStart(record, row);

    for (let col = 0; col < cols; col += 1) {
      const context = createCellContext(matrix, state, row, col, prev);
      recordCapture(record, context);
      processOneCell(state, record, context);
      prev = recordCommit(state, record, context);
    }

    recordRowComplete(state, record, row, prev);
  }
  recordComplete(state, record);

  return {
    matrix,
    rows,
    cols,
    steps: state.steps,
    result: {
      maxSide: state.maxSide,
      area: state.maxSide * state.maxSide,
    },
  };
};
