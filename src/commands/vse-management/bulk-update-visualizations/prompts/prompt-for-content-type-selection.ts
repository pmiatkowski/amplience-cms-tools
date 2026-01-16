import inquirer from 'inquirer';

/**
 * Prompts the user to select content types from a list with a multi-select checkbox
 * and "Select All" option.
 *
 * @param contentTypes - Array of content types to choose from
 * @returns Promise resolving to array of selected content types
 */
export async function promptForContentTypeSelection(
  contentTypes: Amplience.ContentType[]
): Promise<Amplience.ContentType[]> {
  // Create choices with a "Select All" option at the top
  const choices = [
    {
      name: '✓ Select All',
      value: 'SELECT_ALL',
    },
    new inquirer.Separator(),
    ...contentTypes.map(ct => {
      const label = ct.settings?.label?.trim() || ct.contentTypeUri;

      return {
        name: `${label} (${ct.contentTypeUri})`,
        value: ct.id,
      };
    }),
  ];

  const { selectedIds } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedIds',
      message: `Select content types to update (${contentTypes.length} found):`,
      choices,
      validate: (answer: string[]): boolean | string => {
        if (answer.length === 0) {
          return 'You must select at least one content type.';
        }

        return true;
      },
    },
  ] as any); // eslint-disable-line @typescript-eslint/no-explicit-any -- inquirer v10 has complex types that don't work with strict mode for array prompts

  // Handle "Select All" option
  if (selectedIds.includes('SELECT_ALL')) {
    return contentTypes;
  }

  // Filter and return selected content types
  return contentTypes.filter(ct => selectedIds.includes(ct.id));
}
