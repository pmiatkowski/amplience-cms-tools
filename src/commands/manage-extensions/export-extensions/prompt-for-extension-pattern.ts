import inquirer from 'inquirer';

const DEFAULT_PATTERN_FALLBACK = '';

export function getDefaultExtensionFilterPattern(): string {
  return process.env.AMP_DEFAULT_EXTENSION_FILTER?.trim() || DEFAULT_PATTERN_FALLBACK;
}

/**
 * Prompt the user for a regex pattern used to filter exported extensions.
 *
 * @param defaultPattern - Pattern shown by default in the prompt field
 * @example
 * const pattern = await promptForExtensionFilterPattern();
 */
export async function promptForExtensionFilterPattern(
  defaultPattern: string = getDefaultExtensionFilterPattern()
): Promise<string> {
  const { pattern } = await inquirer.prompt<{ pattern: string }>([
    {
      type: 'input',
      name: 'pattern',
      message: 'Regex pattern for filtering extensions (matches ID, URL, description):',
      default: defaultPattern,
    },
  ]);

  const normalized = pattern.trim();

  return normalized.length > 0 ? normalized : defaultPattern;
}
