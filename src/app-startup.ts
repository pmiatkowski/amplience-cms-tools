import { getHubConfigs } from './app-config';
import { validatePatToken } from './services';

export async function runPatTokenPreflight(): Promise<void> {
  if (!process.env.PAT_TOKEN?.trim()) {
    return;
  }

  await validatePatToken(getHubConfigs());
}
