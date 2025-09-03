import * as fsSync from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';

/**
 * Prompt user to select schemas to synchronize.
 * @param schemaFiles An array of schema file paths.
 */
export async function promptForSchemasToSync(schemaFiles: string[]): Promise<string[]> {
  if (schemaFiles.length === 0) {
    return [];
  }

  // Read schema configurations and extract schemaId for display
  const choices: { name: string; value: string }[] = [];

  for (const file of schemaFiles) {
    try {
      const content = fsSync.readFileSync(file, 'utf-8');
      const contentTypeConfig = JSON.parse(content);
      const schemaId = contentTypeConfig.schemaId || path.basename(file);
      choices.push({
        name: schemaId,
        value: file,
      });
    } catch {
      // Fallback to filename if parsing fails
      choices.push({
        name: `${path.basename(file)} (parsing failed)`,
        value: file,
      });
    }
  }

  // Add "Select All" option at the top
  choices.unshift({
    name: '--- Select All ---',
    value: 'SELECT_ALL',
  });

  const { selectedSchemas } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedSchemas',
    message: 'Select schemas to copy to the target hub:',
    choices,
  });

  // Handle "Select All" option
  if (selectedSchemas.includes('SELECT_ALL')) {
    return schemaFiles; // Return all files
  }

  return selectedSchemas.filter((file: string) => file !== 'SELECT_ALL');
}
