import inquirer from 'inquirer';

/**
 * Prompts user whether to update the application or postpone
 * @param currentVersion - Current version of the application
 * @param latestVersion - Latest available version
 * @returns true if user wants to update, false if postponing
 */
export async function promptForUpdate(
  currentVersion: string,
  latestVersion: string
): Promise<boolean> {
  console.log(`\n🆕 A new version of Amplience CMS Tools is available!`);
  console.log(`   Current version: ${currentVersion}`);
  console.log(`   Latest version:  ${latestVersion}\n`);

  const { shouldUpdate } = await inquirer.prompt<{ shouldUpdate: boolean }>([
    {
      type: 'confirm',
      name: 'shouldUpdate',
      message: 'Would you like to update now?',
      default: true,
    },
  ]);

  return shouldUpdate;
}
