import inquirer from 'inquirer';

export async function promptForIncludeHierarchyDescendants(): Promise<boolean> {
  const { includeHierarchyDescendants } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'includeHierarchyDescendants',
      message:
        'Include hierarchy descendants when cleaning items? (If an item has child items in a hierarchy, they will also be cleaned)',
      default: true,
    },
  ]);

  return includeHierarchyDescendants;
}
