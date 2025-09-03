import inquirer from 'inquirer';

export async function promptForHub(hubs: Amplience.HubConfig[]): Promise<Amplience.HubConfig> {
  const { selectedHub } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedHub',
      message: 'Select a hub:',
      choices: hubs.map(h => ({ name: h.name, value: h })),
    },
  ]);

  return selectedHub;
}
