import inquirer from 'inquirer';
import { AmplienceService } from '~/services/amplience-service';

export async function promptForTargetLocale(
  targetService: AmplienceService,
  targetRepositoryId: string,
  selectedItems: Amplience.ContentItem[]
): Promise<string | null> {
  try {
    // Get available locales from target repository
    const localesResult =
      await targetService.getContentRepositoryLocalizationGroupLocales(targetRepositoryId);

    if (!localesResult.success || !localesResult.updatedItem) {
      console.log('⚠️  Could not fetch available locales. Using source locale for all items.');

      return null;
    }

    const availableLocales = localesResult.updatedItem.locales;

    // Get unique source locales from selected items
    const sourceLocales = [
      ...new Set(selectedItems.map(item => item.locale).filter(Boolean)),
    ] as string[];

    // Build choices
    const choices: { name: string; value: string | null }[] = [];

    // Add source locale options
    if (sourceLocales.length === 1) {
      choices.push({
        name: `Keep source locale (${sourceLocales[0]})`,
        value: null,
      });
    } else if (sourceLocales.length > 1) {
      choices.push({
        name: `Keep source locales (${sourceLocales.join(', ')})`,
        value: null,
      });
    } else {
      choices.push({
        name: 'Keep source locale (no locale detected)',
        value: null,
      });
    }

    // Add separator
    if (availableLocales.length > 0) {
      choices.push({ name: '--- Available Target Locales ---', value: 'SEPARATOR' });

      // Add available locales from target repository
      availableLocales.forEach(locale => {
        choices.push({
          name: locale,
          value: locale,
        });
      });
    }

    // Add none option
    choices.push({ name: 'None (no locale)', value: 'NONE' });

    const { selectedLocale } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedLocale',
        message: 'Select target locale for recreated content items:',
        choices: choices.filter(choice => choice.value !== 'SEPARATOR'), // Remove separator from selectable choices
        filter: (value: string | null): string | null | undefined => {
          if (value === 'NONE') {
            return undefined; // Explicitly set to undefined for no locale
          }

          return value;
        },
      },
    ]);

    return selectedLocale;
  } catch (error) {
    console.log('⚠️  Error fetching available locales:', error);
    console.log('   Using source locale for all items.');

    return null;
  }
}
