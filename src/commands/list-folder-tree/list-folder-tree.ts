import { getHubConfigs } from '~/app-config';
import { promptForHub, promptForRepository, promptForConfirmation } from '~/prompts';
import { listNestedSubfolders } from '~/services/actions';
import { AmplienceService } from '~/services/amplience-service';
import { createProgressBar, displayTable } from '~/utils';
import {
  promptForStartFrom,
  promptForSelectedFolder,
  promptForOutputFormat,
  createHierarchicalFolderChoices,
} from './prompts';
import {
  displayFolderTree,
  findNodeById,
  calculateMaxDepth,
  countFoldersWithChildren,
} from './utils';

export async function runListFolderTree(): Promise<void> {
  // 1. Load hub configs
  const hubs = getHubConfigs();

  // 2. Select hub
  const selectedHub = await promptForHub(hubs);
  const service = new AmplienceService(selectedHub);

  // 3. Get repositories
  console.log('Fetching repositories...');
  const repos = await service.getRepositories();
  const selectedRepo = await promptForRepository(repos);

  // 4. Ask if user wants to start from a specific folder or repository root
  const startFrom = await promptForStartFrom();

  let parentFolderId: string | undefined;
  let allFoldersForReference: Amplience.Folder[] = [];

  if (startFrom === 'parent') {
    // Get complete folder structure to let user choose any folder
    console.log('Fetching complete folder structure...');
    const allFoldersResult = await listNestedSubfolders(service, selectedRepo.id);
    allFoldersForReference = allFoldersResult.raw;

    if (allFoldersResult.raw.length === 0) {
      console.log('No folders found in this repository.');

      return;
    }

    // Create hierarchical choices for folder selection
    const folderChoices = createHierarchicalFolderChoices(allFoldersResult.tree);

    if (folderChoices.length === 0) {
      console.log('No folders found in this repository.');

      return;
    }

    const selectedFolder = await promptForSelectedFolder(folderChoices);

    // Handle special ROOT case
    if (selectedFolder === 'ROOT') {
      parentFolderId = undefined; // This will show all folders from repository root
    } else {
      parentFolderId = selectedFolder;
    }
  }

  // 5. Ask for output format preference
  const outputFormat = await promptForOutputFormat();

  // 6. Confirm before proceeding
  let startLocation: string;
  if (parentFolderId) {
    // Find the folder name for better user experience
    const selectedFolderInfo = allFoldersForReference.find(
      (f: Amplience.Folder) => f.id === parentFolderId
    );
    const folderName = selectedFolderInfo ? selectedFolderInfo.name : parentFolderId;
    startLocation = `folder "${folderName}" (${parentFolderId})`;
  } else {
    startLocation = 'repository root';
  }

  const confirmed = await promptForConfirmation(
    `List all nested folders from ${startLocation} in repository "${selectedRepo.label}"?`
  );

  if (!confirmed) {
    console.log('Operation cancelled.');

    return;
  }

  // 7. Fetch folder tree
  console.log('\nFetching folder structure...');
  const progressBar = createProgressBar(1, 'Fetching folders');

  try {
    const result = await listNestedSubfolders(service, selectedRepo.id, parentFolderId);
    progressBar.update(1);
    progressBar.stop();

    // 8. Display results based on user preference
    console.log(`\n✅ Found ${result.raw.length} folders total`);

    if (outputFormat === 'tree' || outputFormat === 'all') {
      console.log('\n🌳 Folder Tree Structure:');
      displayFolderTree(result.tree, 0);
    }

    if (outputFormat === 'table' || outputFormat === 'all') {
      console.log('\n📊 Folder Table:');
      const tableData = result.raw.map(folder => ({
        id: folder.id,
        name: folder.name,
        hasSubfolders: result.tree.some(node => {
          const foundNode = findNodeById(node, folder.id);

          return foundNode?.children.length && foundNode.children.length > 0;
        })
          ? 'Yes'
          : 'No',
      }));
      displayTable(tableData);
    }

    if (outputFormat === 'raw' || outputFormat === 'all') {
      console.log('\n📄 Raw JSON Output:');
      console.log(JSON.stringify(result, null, 2));
    }

    // 9. Summary statistics
    console.log('\n📈 Summary:');
    console.log(`Total folders: ${result.raw.length}`);
    console.log(`Root-level folders: ${result.tree.length}`);

    const maxDepth = calculateMaxDepth(result.tree);
    console.log(`Maximum nesting depth: ${maxDepth}`);

    const foldersWithChildren = result.tree.filter(
      node => countFoldersWithChildren(node) > 0
    ).length;
    console.log(`Folders with subfolders: ${foldersWithChildren}`);
  } catch (error) {
    progressBar.stop();
    console.error('❌ Error fetching folder structure:', error);
    throw error;
  }
}
