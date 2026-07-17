import { describe, expect, it } from "vitest";
import { moveStep, playbackDelay } from "./player";

describe("moveStep", () => {
  it("moves one frame and clamps navigation to the trace boundaries", () => {
    expect(moveStep(4, 1, 10)).toBe(5);
    expect(moveStep(4, -1, 10)).toBe(3);
    expect(moveStep(0, -1, 10)).toBe(0);
    expect(moveStep(9, 1, 10)).toBe(9);
  });
});

describe("playbackDelay", () => {
  it("turns the speed multiplier into a readable animation delay", () => {
    expect(playbackDelay(0.5)).toBe(1800);
    expect(playbackDelay(1)).toBe(900);
    expect(playbackDelay(2)).toBe(450);
    expect(playbackDelay(4)).toBe(225);
  });
});
