import inquirer from 'inquirer';

export async function promptForCommand(): Promise<CommandChoice> {
  const { command } = await inquirer.prompt([
    {
      type: 'list',
      name: 'command',
      message: 'Select a command to run:',
      choices: [
        {
          name: 'Synchronize content-item hierarchy (recreates missing items based on source hierarchy)',
          value: 'sync-hierarchy',
        },
        {
          name: 'Synchronize content-type properties (Synchronizes content types with their schemas)',
          value: 'sync-content-type-properties',
        },
        {
          name: 'Copy content-type-schemas (Recreates non-archived content-type schema)',
          value: 'copy-content-type-schemas',
        },
        {
          name: 'Copy content-types (Creates missing content-types and assigns to repositories)',
          value: 'copy-content-types',
        },
        { name: 'Copy folder with its content-items', value: 'copy-folder-with-content' },
        { name: 'Copy content-items (including hierarchies)', value: 'recreate-content-items' },
        {
          name: 'Copy folders tree structure (without content-items)',
          value: 'recreate-folder-structure',
        },
        {
          name: 'Remove folder (Remove all folders nesting and archive content items within each folder)',
          value: 'cleanup-folder',
        },
        { name: 'Remove content-items (Archive)', value: 'clean-repo' },
        {
          name: 'Remove content-type-schemas (Archive with content-types and content-items binded items)',
          value: 'archive-content-type-schemas',
        },
        { name: 'List folder tree structure', value: 'list-folder-tree' },
        { name: 'Update delivery keys locale (prefix/suffix)', value: 'update-locale' },
      ],
    },
  ]);

  return command;
}

type CommandChoice =
  | 'update-locale'
  | 'clean-repo'
  | 'list-folder-tree'
  | 'cleanup-folder'
  | 'recreate-folder-structure'
  | 'recreate-content-items'
  | 'copy-folder-with-content'
  | 'copy-content-type-schemas'
  | 'copy-content-types'
  | 'sync-content-type-properties'
  | 'archive-content-type-schemas'
  | 'sync-hierarchy';
