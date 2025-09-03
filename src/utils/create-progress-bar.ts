import cliProgress from 'cli-progress';

/**
 * Create a progress bar instance
 */
export function createProgressBar(total: number, message = 'Progress'): cliProgress.SingleBar {
  const bar = new cliProgress.SingleBar(
    {
      format: `${message} |{bar}| {value}/{total}`,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  bar.start(total, 0);

  return bar;
}
