import { beforeEach, describe, expect, it, vi } from 'vitest';

const { bars, singleBarConstructor } = vi.hoisted(() => ({
  bars: [] as Array<{
    setTotal: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  }>,
  singleBarConstructor: vi.fn(),
}));

vi.mock('cli-progress', () => ({
  default: {
    Presets: { shades_classic: {} },
    SingleBar: singleBarConstructor,
  },
}));

import { createPhaseProgressBar } from './create-progress-bar';

function createBarMock(): (typeof bars)[number] {
  return {
    setTotal: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    update: vi.fn(),
  };
}

describe('createPhaseProgressBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bars.length = 0;
    singleBarConstructor.mockImplementation(() => {
      const bar = createBarMock();
      bars.push(bar);

      return bar;
    });
  });

  it('creates the first phase lazily and updates it in place', () => {
    const progress = createPhaseProgressBar();

    expect(singleBarConstructor).not.toHaveBeenCalled();

    progress.update('discovery', 0, 2);
    progress.update('discovery', 1, 3);

    expect(singleBarConstructor).toHaveBeenCalledOnce();
    expect(bars[0].start).toHaveBeenCalledWith(2, 0);
    expect(bars[0].setTotal).toHaveBeenLastCalledWith(3);
    expect(bars[0].update).toHaveBeenLastCalledWith(1);
  });

  it('stops the previous bar and starts a new bar when the phase changes', () => {
    const progress = createPhaseProgressBar();

    progress.update('discovery', 2, 2);
    progress.update('matching', 0, 4);
    progress.update('delivery-key-inventory', 1, 3);

    expect(singleBarConstructor).toHaveBeenCalledTimes(3);
    expect(bars[0].stop).toHaveBeenCalledOnce();
    expect(bars[1].stop).toHaveBeenCalledOnce();
    expect(bars[2].start).toHaveBeenCalledWith(3, 1);
  });

  it('stops the active bar once', () => {
    const progress = createPhaseProgressBar();

    progress.update('delivery-key-validation', 1, 2);
    progress.stop();
    progress.stop();

    expect(bars[0].stop).toHaveBeenCalledOnce();
  });
});
