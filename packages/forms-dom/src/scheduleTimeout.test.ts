import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { scheduleTimeout } from "./scheduleTimeout";

describe("scheduleTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("runs the callback once, after the delay", () => {
    const callback = vi.fn();
    scheduleTimeout(callback, 300);

    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledOnce();
  });

  test("never runs a callback that was cancelled", () => {
    const callback = vi.fn();
    const cancel = scheduleTimeout(callback, 300);

    cancel();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });

  test("cancelling after the callback ran does nothing", () => {
    const callback = vi.fn();
    const cancel = scheduleTimeout(callback, 0);

    vi.runAllTimers();
    expect(() => {
      cancel();
    }).not.toThrow();
    expect(callback).toHaveBeenCalledOnce();
  });
});
