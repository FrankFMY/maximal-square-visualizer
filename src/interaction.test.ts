import { describe, expect, it, vi } from "vitest";
import { dispatchAction, parseGridCoordinates } from "./interaction";

describe("dispatchAction", () => {
  it("dispatches whitelisted names and safely ignores prototype-like names", () => {
    const play = vi.fn();
    const actions = new Map<string, (target: { kind: string }) => void>([["play", play]]);
    const target = { kind: "button" };

    expect(dispatchAction(actions, "__proto__", target)).toBe(false);
    expect(play).not.toHaveBeenCalled();

    expect(dispatchAction(actions, "play", target)).toBe(true);
    expect(play).toHaveBeenCalledOnce();
  });
});

describe("parseGridCoordinates", () => {
  it("accepts only integer coordinates inside the matrix", () => {
    expect(parseGridCoordinates("2", "4", 6, 7)).toEqual({ row: 2, col: 4 });

    for (const [row, col] of [
      [undefined, "0"],
      ["", ""],
      ["2.5", "1"],
      ["-1", "0"],
      ["6", "0"],
      ["0", "7"],
      ["not-a-number", "0"],
    ] as const) {
      expect(parseGridCoordinates(row, col, 6, 7)).toBeNull();
    }
  });
});
