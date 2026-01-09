import inquirer from 'inquirer';

export type PreviewModeChoice = 'preview' | 'execute';

/**
 * Prompt the user to pick between preview mode or direct execution.
 *
 * @example
 * const mode = await promptForPreviewMode();
 */
export async function promptForPreviewMode(): Promise<PreviewModeChoice> {
  const { mode } = await inquirer.prompt<{ mode: PreviewModeChoice }>([
    {
      type: 'list',
      name: 'mode',
      message: 'Would you like to preview matching extensions before filtering?',
      default: 'preview',
      choices: [
        {
          name: 'Preview results before filtering (recommended)',
          value: 'preview',
        },
        {
          name: 'Execute immediately without preview',
          value: 'execute',
        },
      ],
    },
  ]);

  return mode;
}
