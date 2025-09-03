import inquirer from 'inquirer';

export async function promptForPublishUpdatedItems(count: number): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Do you want to publish the ${count} successfully updated items?`,
      default: false,
    },
  ]);

  return confirmed;
}
