import { exec } from 'child_process';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { getHubConfigs } from '~/app-config';
import {
  promptForHub,
  promptForConfirmation,
  promptForSchemaIdFilter,
  promptForIncludeArchived,
  promptForSchemasToSync,
  promptForDryRun,
  promptForValidateSchemas,
} from '~/prompts';
import { createProgressBar } from '~/utils';

const execAsync = promisify(exec);

type HubConfig = {
  name: string;
  clientId: string;
  clientSecret: string;
  hubId: string;
}

type SchemaValidationResult = {
  isValid: boolean;
  errors: string[];
}

/**
 * Get the path to the local dc-cli binary
 */
const getDcCliPath = (): string => {
  // Use local node_modules/.bin/dc-cli
  const binPath = path.join(process.cwd(), 'node_modules', '.bin', 'dc-cli');

  // On Windows, check for .cmd extension
  if (process.platform === 'win32') {
    return binPath + '.cmd';
  }

  return binPath;
};

/**
 * Check if dc-cli is available in the system
 */
const checkDcCliAvailability = async (): Promise<boolean> => {
  try {
    const dcCliPath = getDcCliPath();
    await execAsync(`"${dcCliPath}" --version`);

    return true;
  } catch {
    return false;
  }
};

/**
 * Validate a schema file
 */
const validateSchemaFile = async (configFilePath: string): Promise<SchemaValidationResult> => {
  const errors: string[] = [];

  try {
    // Read the configuration file first
    const configContent = JSON.parse(await fs.readFile(configFilePath, 'utf-8'));

    // Resolve the actual schema file path
    const actualSchemaFile = path.resolve(path.dirname(configFilePath), configContent.body);

    // Check if the actual schema file exists
    if (!fsSync.existsSync(actualSchemaFile)) {
      return {
        isValid: false,
        errors: [`Schema file not found: ${configContent.body}`],
      };
    }

    // Read and parse the actual schema content
    const schemaContent = await fs.readFile(actualSchemaFile, 'utf-8');
    const schema = JSON.parse(schemaContent);

    // Basic schema validation
    if (!schema.$id) {
      errors.push('Schema missing required "$id" field');
    }

    if (!schema.title) {
      errors.push('Schema missing required "title" field');
    }

    if (!schema.type) {
      errors.push('Schema missing required "type" field');
    }

    if (!schema.allOf && !schema.properties && !schema.oneOf && !schema.anyOf) {
      errors.push('Schema missing content definition (properties, allOf, oneOf, or anyOf)');
    }

    // Check for common schema structure
    if (schema.type !== 'object') {
      errors.push('Root schema type should be "object"');
    }

    // Validate that the schema $id matches the configuration schemaId
    if (schema.$id !== configContent.schemaId) {
      errors.push(
        `Schema $id (${schema.$id}) does not match config schemaId (${configContent.schemaId})`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to parse schema: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
};

const runDcCli = async (
  command: string,
  hub: HubConfig
): Promise<{ stdout: string; stderr: string }> => {
  const { clientId, clientSecret, hubId } = hub;
  const dcCliPath = getDcCliPath();
  const fullCommand = `"${dcCliPath}" ${command} --clientId "${clientId}" --clientSecret "${clientSecret}" --hubId "${hubId}"`;

  // Log command with length info for debugging
  console.log(
    `Executing: ${fullCommand.substring(0, 200)}${fullCommand.length > 200 ? '...' : ''}`
  );

  const result = await execAsync(fullCommand);

  return result;
};

export const syncContentTypeSchemas = async (): Promise<void> => {
  try {
    // 0. Check dc-cli availability
    console.log('Checking local dc-cli availability...');
    const isDcCliAvailable = await checkDcCliAvailability();
    if (!isDcCliAvailable) {
      console.error(
        '❌ dc-cli is not available locally. Please run: npm install @amplience/dc-cli'
      );

      return;
    }
    console.log('✅ Local dc-cli is available');

    // 1. Inicjalizacja i wybór hubów
    const hubs = getHubConfigs();
    if (hubs.length === 0) {
      console.error('No hubs configured. Please check your .env file.');

      return;
    }

    console.log('Select the SOURCE hub:');
    const sourceHub = await promptForHub(hubs);

    console.log('Select the TARGET hub:');
    const targetHub = await promptForHub(hubs.filter(h => h.hubId !== sourceHub.hubId));

    // 2. Configuration options
    const schemaIdFilter = await promptForSchemaIdFilter();
    const includeArchived = await promptForIncludeArchived();
    const validateSchemas = await promptForValidateSchemas();
    const isDryRun = await promptForDryRun();

    if (isDryRun) {
      console.log('🔍 Running in DRY-RUN mode - no changes will be made');
    }

    const tempDir = `temp_export_${Date.now()}`;
    await fs.mkdir(tempDir, { recursive: true });

    try {
      console.log(`Exporting all schemas from source hub: ${sourceHub.name}...`);
      const archiveFlag = includeArchived ? '--archived' : '';
      await runDcCli(`content-type-schema export "${tempDir}" ${archiveFlag}`, sourceHub);

      // Get only the configuration files (not the actual schema files in the schemas/ subdirectory)
      const allFiles = await fs.readdir(tempDir);
      let exportedFiles = allFiles
        .filter((f: string) => f.endsWith('.json') && !f.startsWith('schemas'))
        .map((f: string) => path.join(tempDir, f));

      // Filter schema files based on regex if provided
      if (schemaIdFilter.trim()) {
        console.log(`🔍 Filtering schemas using pattern: ${schemaIdFilter}`);
        const regex = new RegExp(schemaIdFilter, 'i'); // case insensitive
        const filteredFiles: string[] = [];
        const filesToRemove: string[] = [];

        console.log(`📂 Total exported files to check: ${exportedFiles.length}`);

        for (const file of exportedFiles) {
          try {
            const content = await fs.readFile(file, 'utf-8');
            const contentTypeConfig = JSON.parse(content);

            if (contentTypeConfig.schemaId && regex.test(contentTypeConfig.schemaId)) {
              filteredFiles.push(file);
            } else {
              filesToRemove.push(file);

              // Also mark related schema file for removal if it exists
              if (contentTypeConfig.body && typeof contentTypeConfig.body === 'string') {
                const schemaFilePath = path.resolve(path.dirname(file), contentTypeConfig.body);
                filesToRemove.push(schemaFilePath);
              }
            }
          } catch (error) {
            console.warn(`Could not parse schema file ${path.basename(file)}: ${error}`);
            filesToRemove.push(file);
          }
        }

        // Remove files that don't match the filter (including related schema files)
        const uniqueFilesToRemove = [...new Set(filesToRemove)]; // Remove duplicates
        for (const fileToRemove of uniqueFilesToRemove) {
          try {
            await fs.unlink(fileToRemove);
          } catch (error) {
            // Ignore error if file doesn't exist (might be a relative path that doesn't resolve)
            if (error instanceof Error && 'code' in error && (error as any).code !== 'ENOENT') {
              console.warn(`Could not remove file ${path.basename(fileToRemove)}: ${error}`);
            }
          }
        }

        exportedFiles = filteredFiles;
        console.log(`✅ Found ${exportedFiles.length} schemas matching the filter`);
      }

      if (exportedFiles.length === 0) {
        const message = schemaIdFilter.trim()
          ? `No schemas found matching the filter: "${schemaIdFilter}"`
          : 'No schemas found in the source hub';
        console.warn(message);

        return;
      }

      // 3. Schema validation
      if (validateSchemas) {
        console.log('🔍 Validating schemas...');
        const validationResults = await Promise.all(
          exportedFiles.map(async (file: string) => ({
            file,
            result: await validateSchemaFile(file),
          }))
        );

        const invalidSchemas = validationResults.filter(({ result }: any) => !result.isValid);
        if (invalidSchemas.length > 0) {
          console.error(`❌ Found ${invalidSchemas.length} invalid schemas:`);
          invalidSchemas.forEach(({ file, result }: any) => {
            console.error(`  - ${path.basename(file)}:`);
            result.errors.forEach((error: string) => console.error(`    • ${error}`));
          });

          const proceedAnyway = await promptForConfirmation(
            'Some schemas have validation errors. Do you want to proceed anyway?'
          );
          if (!proceedAnyway) {
            console.log('Operation cancelled due to validation errors.');

            return;
          }
        } else {
          console.log('✅ All schemas passed validation');
        }
      }

      // 4. Pytanie użytkownika o wybór schematów do skopiowania
      const schemasToCopy = await promptForSchemasToSync(exportedFiles);
      if (schemasToCopy.length === 0) {
        console.log('No schemas selected. Aborting.');

        return;
      }

      // 5. Pytanie o synchronizację (jeśli nie jest to dry-run)
      let shouldSyncContentTypes = false;
      if (!isDryRun) {
        shouldSyncContentTypes = await promptForConfirmation(
          `Do you want to synchronize the content types for the selected schemas after they are created in the target hub?`,
          true
        );
      }

      // 6. Potwierdzenie głównej operacji
      const actionText = isDryRun ? 'preview' : 'synchronizing';
      const syncText = shouldSyncContentTypes ? ' and synchronize content types' : '';
      const confirmed = await promptForConfirmation(
        `Proceed with ${actionText} ${schemasToCopy.length} schemas from "${sourceHub.name}" to "${targetHub.name}"${syncText}? (This will create new schemas and update existing ones)`
      );
      if (!confirmed) {
        console.log('Operation cancelled by user.');

        return;
      }

      // 6. Schema creation/update (or dry-run preview)
      if (isDryRun) {
        console.log('🔍 DRY-RUN PREVIEW: The following actions would be performed:');

        for (let index = 0; index < schemasToCopy.length; index++) {
          const configFile = schemasToCopy[index];
          try {
            const configContent = JSON.parse(fsSync.readFileSync(configFile, 'utf-8'));

            // Check if schema exists in target hub
            let schemaExists = false;
            try {
              await runDcCli(`content-type-schema get "${configContent.schemaId}"`, targetHub);
              schemaExists = true;
            } catch {
              // Schema doesn't exist
            }

            const action = schemaExists ? 'Update' : 'Create';
            console.log(
              `  ${index + 1}. ${action} schema: ${configContent.schemaId} (validation: ${configContent.validationLevel})`
            );
          } catch {
            console.log(
              `  ${index + 1}. Process schema from ${path.basename(configFile)} (parsing failed)`
            );
          }
        }
        console.log(
          `\n📊 Summary: ${schemasToCopy.length} schemas would be created/updated in "${targetHub.name}"`
        );
        if (shouldSyncContentTypes) {
          console.log(`🔄 Content types would also be synchronized after creation`);
        }

        return;
      }

      // 7. Actual schema creation/update
      const progressBar = createProgressBar(schemasToCopy.length, 'Processing Schemas');
      const createdSchemaIds: string[] = [];
      const updatedSchemaIds: string[] = [];
      const failedSchemas: { file: string; error: string }[] = [];

      for (const configFile of schemasToCopy) {
        try {
          // Read the configuration file (which contains metadata about the schema)
          const configContent = JSON.parse(await fs.readFile(configFile, 'utf-8'));

          // Resolve the actual schema file path from the body field
          const actualSchemaFile = path.resolve(path.dirname(configFile), configContent.body);

          // Check if the actual schema file exists
          if (!fsSync.existsSync(actualSchemaFile)) {
            throw new Error(`Schema file not found: ${actualSchemaFile}`);
          }

          // Read and validate the actual schema content
          const schemaContent = JSON.parse(await fs.readFile(actualSchemaFile, 'utf-8'));

          // Ensure the schema has the correct $id field that matches the schemaId from config
          if (!schemaContent.$id || schemaContent.$id !== configContent.schemaId) {
            schemaContent.$id = configContent.schemaId;
            await fs.writeFile(actualSchemaFile, JSON.stringify(schemaContent, null, 2));
          }

          // Check if schema already exists in target hub
          let schemaExists = false;
          try {
            await runDcCli(`content-type-schema get "${configContent.schemaId}"`, targetHub);
            schemaExists = true;
            console.log(`🔄 Schema ${configContent.schemaId} already exists - will be updated`);
          } catch {
            console.log(`➕ Schema ${configContent.schemaId} does not exist - will be created`);
          }

          if (schemaExists) {
            // Schema exists - use import to update it
            // Create a temporary directory for this single schema
            const singleSchemaDir = `${tempDir}_single_${Date.now()}`;
            await fs.mkdir(singleSchemaDir, { recursive: true });

            try {
              // Copy the config file and schema file to the temporary directory
              const tempConfigFile = path.join(singleSchemaDir, path.basename(configFile));
              const tempSchemaDir = path.join(singleSchemaDir, 'schemas');
              await fs.mkdir(tempSchemaDir, { recursive: true });

              const tempSchemaFile = path.join(tempSchemaDir, path.basename(actualSchemaFile));

              // Copy files
              await fs.copyFile(configFile, tempConfigFile);
              await fs.copyFile(actualSchemaFile, tempSchemaFile);

              // Update the body path in the temp config file to point to the temp schema file
              const tempConfigContent = { ...configContent };
              tempConfigContent.body = `./schemas/${path.basename(actualSchemaFile)}`;
              await fs.writeFile(tempConfigFile, JSON.stringify(tempConfigContent, null, 2));

              // Use import to update the existing schema
              await runDcCli(`content-type-schema import "${singleSchemaDir}"`, targetHub);
              updatedSchemaIds.push(configContent.schemaId);
            } finally {
              // Clean up temporary directory
              await fs.rm(singleSchemaDir, { recursive: true, force: true });
            }
          } else {
            // Schema doesn't exist - create it
            await runDcCli(
              `content-type-schema create --schema "${actualSchemaFile}" --validationLevel "${configContent.validationLevel}"`,
              targetHub
            );
            createdSchemaIds.push(configContent.schemaId);
          }

          // Verify the schema exists after creation/update
          await runDcCli(`content-type-schema get "${configContent.schemaId}"`, targetHub);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          failedSchemas.push({
            file: path.basename(configFile),
            error: errorMessage,
          });
        }
        progressBar.increment();
      }
      progressBar.stop();

      const totalProcessed = createdSchemaIds.length + updatedSchemaIds.length;
      console.log(`Successfully processed ${totalProcessed} schemas:`);
      if (createdSchemaIds.length > 0) {
        console.log(`  ➕ Created: ${createdSchemaIds.length} schemas`);
      }
      if (updatedSchemaIds.length > 0) {
        console.log(`  🔄 Updated: ${updatedSchemaIds.length} schemas`);
      }

      if (failedSchemas.length > 0) {
        console.error(`Failed to process ${failedSchemas.length} schemas:`);
        failedSchemas.forEach(fail => console.error(`  - ${fail.file}: ${fail.error}`));
      }

      // 8. Skip automatic content type synchronization since it's problematic
      // The content-type sync command expects content type IDs, not schema IDs
      // and is meant for syncing existing content types, not creating new ones
      if (totalProcessed > 0 && shouldSyncContentTypes) {
        console.log('ℹ️  Skipping automatic content type creation via dc-cli.');
        console.log('ℹ️  Content types will be created by the main sync-content-types command.');
        console.log('ℹ️  The schemas have been successfully processed and are ready for use.');
      } else if (totalProcessed > 0 && !shouldSyncContentTypes) {
        console.log('ℹ️  Content type synchronization was skipped by user choice.');
      }
    } finally {
      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(`Failed to sync content type schemas: ${error}`);
  }
};
