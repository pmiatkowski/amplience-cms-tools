import { exec } from 'child_process';
import { promisify } from 'util';
import * as semver from 'semver';
import { getAppVersion } from '~/utils';

const execAsync = promisify(exec);

const GITHUB_REPO = 'pmiatkowski/amplience-cms-tools';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Checks if a new version is available
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = getAppVersion();

  try {
    const latestVersion = await fetchLatestVersion();

    if (!latestVersion) {
      return {
        updateAvailable: false,
        currentVersion,
        error: 'Could not determine latest version',
      };
    }

    // Compare versions using semver
    const isNewer = semver.gt(latestVersion, currentVersion);

    return {
      updateAvailable: isNewer,
      currentVersion,
      latestVersion,
    };
  } catch (error) {
    return {
      updateAvailable: false,
      currentVersion,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetches the latest release version from GitHub
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const data = await response.json();
    const tagName = data.tag_name;

    // Remove 'v' prefix if present (e.g., 'v1.0.0' -> '1.0.0')
    return tagName.startsWith('v') ? tagName.slice(1) : tagName;
  } catch (error) {
    throw new Error(
      `Failed to fetch latest version: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Performs the update by pulling from git and installing dependencies
 * Returns true if successful, false otherwise
 */
export async function performUpdate(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('\n🔄 Updating application...');

    // Pull latest changes from git
    console.log('📥 Pulling latest changes from git...');
    await execAsync('git pull origin main');

    // Install dependencies
    console.log('📦 Installing dependencies...');
    await execAsync('npm install');

    console.log('✅ Update completed successfully!');
    console.log('🔄 Restarting application...\n');

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error: `Update failed: ${errorMessage}`,
    };
  }
}

/**
 * Restarts the application by exiting with code 0
 * The user will need to manually restart, or we can use process.exit and rely on external restart
 */
export function restartApplication(): void {
  // Exit with success code - user should be instructed to restart
  // or if using npm start, it will naturally restart on next invocation
  process.exit(0);
}

/**
 * Result of checking for updates
 */
export type UpdateCheckResult = {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  error?: string;
};
