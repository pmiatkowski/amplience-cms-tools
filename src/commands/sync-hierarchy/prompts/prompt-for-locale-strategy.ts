import inquirer from 'inquirer';

/**
 * Prompt user for locale strategy for hierarchy synchronization
 */
export async function promptForLocaleStrategy(
  service: {
    getLocalizationGroupLocales: (repoId: string) => Promise<string[]>;
  },
  targetRepositoryId: string
): Promise<{ strategy: 'keep' | 'remove' | 'replace'; targetLocale?: string }> {
  const { strategy } = await inquirer.prompt([
    {
      type: 'list',
      name: 'strategy',
      message: 'How should locale prefixes be handled in delivery keys?',
      choices: [
        { name: 'Keep source locale prefixes unchanged', value: 'keep' },
        { name: 'Remove locale prefixes from delivery keys', value: 'remove' },
        { name: 'Replace with target repository locale', value: 'replace' },
      ],
    },
  ]);

  if (strategy === 'replace') {
    try {
      console.log('Fetching available locales for target repository...');
      const locales = await service.getLocalizationGroupLocales(targetRepositoryId);

      if (locales.length === 0) {
        console.log('No locales found for target repository. Falling back to keep strategy.');

        return { strategy: 'keep' };
      }

      const { targetLocale } = await inquirer.prompt([
        {
          type: 'list',
          name: 'targetLocale',
          message: 'Select target locale:',
          choices: locales.map(locale => ({ name: locale, value: locale })),
        },
      ]);

      return { strategy, targetLocale };
    } catch (error) {
      console.error('Error fetching locales:', error);
      console.log('Falling back to keep strategy.');

      return { strategy: 'keep' };
    }
  }

  return { strategy };
}
