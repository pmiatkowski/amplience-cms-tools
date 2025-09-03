import inquirer from 'inquirer';

export async function promptForItemsToRecreate(
  items: Amplience.ContentItem[]
): Promise<Amplience.ContentItem[]> {
  const choices = items.map(item => ({
    name: `${item.label} ${item.body._meta?.deliveryKey ? `(DeliveryKey: ${item.body._meta.deliveryKey})` : ''}) - ${item.status} - ${item.body._meta?.schema}`,
    value: item.id,
    checked: false,
  }));

  // Add "Select All" option
  choices.unshift({
    name: '--- Select All ---',
    value: 'SELECT_ALL',
    checked: false,
  });

  const { selectedIds } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedIds',
      message: `Select content items to recreate (${items.length} found):`,
      choices,
      pageSize: 15,
    },
  ]);

  // Handle "Select All" option
  if (selectedIds.includes('SELECT_ALL')) {
    return items;
  }

  return items.filter(item => selectedIds.includes(item.id));
}
