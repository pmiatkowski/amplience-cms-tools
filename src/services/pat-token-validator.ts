import { AmplienceApiError } from './amplience-api-error';
import { AmplienceService } from './amplience-service';

export async function validatePatToken(hubs: Amplience.HubConfig[]): Promise<void> {
  const patHub = hubs.find((hub): hub is Amplience.HubPATConfig => Boolean(hub.patToken?.trim()));

  if (!patHub) {
    return;
  }

  try {
    await new AmplienceService(patHub).validateAuthentication();
  } catch (error) {
    if (error instanceof AmplienceApiError && error.status === 401) {
      throw new Error(
        'PAT_TOKEN is invalid. Update PAT_TOKEN in your .env file before running a command.'
      );
    }

    if (error instanceof AmplienceApiError && error.status === 403) {
      throw new Error(
        `PAT_TOKEN does not have access to hub "${patHub.name}". Check the token permissions before running a command.`
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not validate PAT_TOKEN using hub "${patHub.name}": ${message}`);
  }
}
