import cliProgress from 'cli-progress';

function startProgressBar(total: number, message: string, current: number): cliProgress.SingleBar {
  const bar = new cliProgress.SingleBar(
    {
      format: `${message} |{bar}| {value}/{total}`,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  bar.start(total, current);

  return bar;
}

export function createPhaseProgressBar(): PhaseProgressBar {
  let activeBar: cliProgress.SingleBar | undefined;
  let activePhase: string | undefined;

  return {
    update(phase: string, current: number, total: number): void {
      if (phase !== activePhase) {
        activeBar?.stop();
        activeBar = startProgressBar(total, phase, current);
        activePhase = phase;

        return;
      }

      activeBar?.setTotal(total);
      activeBar?.update(current);
    },
    stop(): void {
      activeBar?.stop();
      activeBar = undefined;
      activePhase = undefined;
    },
  };
}

/**
 * Create a progress bar instance
 */
export function createProgressBar(total: number, message = 'Progress'): cliProgress.SingleBar {
  return startProgressBar(total, message, 0);
}

export type PhaseProgressBar = {
  stop: () => void;
  update: (phase: string, current: number, total: number) => void;
};
