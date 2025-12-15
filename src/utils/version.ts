import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Retrieves the current application version.
 * Prioritizes package.json version, falls back to '0.0.0-development'.
 */
export function getAppVersion(): string {
  try {
    // Try to read package.json from the current working directory
    // This assumes the app is run from the project root or package.json is available
    const packageJsonPath = join(process.cwd(), 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    return pkg.version || '0.0.0-development';
  } catch {
    return '0.0.0-development';
  }
}
