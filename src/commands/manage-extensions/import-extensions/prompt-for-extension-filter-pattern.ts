import inquirer from 'inquirer';

/**
 * Default filter pattern for importing extensions.
 * Can be overridden by AMP_DEFAULT_EXTENSION_FILTER environment variable.
 * Default matches all extensions (regex: .*)
 */
export const DEFAULT_EXTENSION_FILTER_PATTERN = process.env.AMP_DEFAULT_EXTENSION_FILTER || '.*';

/**
 * Prompt the user for a regex pattern to filter which extensions to import.
 *
 * Pattern is matched against extension ID, URL, and description fields.
 * Defaults to AMP_DEFAULT_EXTENSION_FILTER environment variable if set, otherwise '.*' (all extensions).
 *
 * @param defaultPattern - Suggested regex pattern shown in the prompt
 * @example
 * const pattern = await promptForExtensionFilterPattern();
 * // User enters: "my-extension-.*"
 * // Result: "my-extension-.*"
 * @example
 * const pattern = await promptForExtensionFilterPattern('test-.*');
 * // Prompt shows: test-.* as default
 */
export async function promptForExtensionFilterPattern(
  defaultPattern: string = DEFAULT_EXTENSION_FILTER_PATTERN
): Promise<string> {
  const { pattern } = await inquirer.prompt<{ pattern: string }>([
    {
      type: 'input',
      name: 'pattern',
      message: 'Enter a filter pattern (regex) to match extensions (or press Enter for all):',
      default: defaultPattern,
      validate: (input: string): string | boolean =>
        input.trim().length > 0 || 'Please enter a pattern or press Enter to use default.',
    },
  ]);

  const normalized = pattern.trim();

  return normalized.length > 0 ? normalized : defaultPattern;
}
