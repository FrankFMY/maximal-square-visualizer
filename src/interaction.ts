export interface GridCoordinates {
  row: number;
  col: number;
}

export const parseGridCoordinates = (
  rowValue: string | undefined,
  colValue: string | undefined,
  rowCount: number,
  colCount: number,
): GridCoordinates | null => {
  if (!rowValue?.trim() || !colValue?.trim()) return null;

  const row = Number(rowValue);
  const col = Number(colValue);
  const isInsideGrid = row >= 0 && row < rowCount && col >= 0 && col < colCount;

  if (!Number.isInteger(row) || !Number.isInteger(col) || !isInsideGrid) return null;

  return { row, col };
};

export const dispatchAction = <Target>(
  actions: ReadonlyMap<string, (target: Target) => void>,
  name: string | undefined,
  target: Target,
): boolean => {
  if (!name) return false;

  const action = actions.get(name);
  if (!action) return false;

  action(target);
  return true;
};
