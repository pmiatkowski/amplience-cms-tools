import inquirer from 'inquirer';

import type { ExportMode } from '~/services/actions/export-extensions';

const EXPORT_MODE_LABELS: Record<ExportMode, string> = {
  'full-overwrite':
    'Full overwrite - Delete all existing files, export all filtered extensions fresh',
  'overwrite-matching':
    'Overwrite matching only - Keep existing non-matching files, re-download only extensions matching the pattern',
  'get-missing':
    'Get missing only - Keep all existing files, add only extensions not already present',
};

/**
 * Prompt user to select how existing files should be handled
 *
 * @example
 * const mode = await promptForExportMode();
 */
export async function promptForExportMode(): Promise<ExportMode> {
  const { mode } = await inquirer.prompt<{ mode: ExportMode }>([
    {
      type: 'list',
      name: 'mode',
      message: 'How would you like to handle existing files?',
      choices: [
        {
          name: EXPORT_MODE_LABELS['full-overwrite'],
          value: 'full-overwrite',
        },
        {
          name: EXPORT_MODE_LABELS['overwrite-matching'],
          value: 'overwrite-matching',
        },
        {
          name: EXPORT_MODE_LABELS['get-missing'],
          value: 'get-missing',
        },
      ],
    },
  ]);

  return mode;
}
