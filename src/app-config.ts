import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

function getHubConfigs(): Amplience.HubConfig[] {
  const hubsEnv = process.env.AMP_HUBS;
  if (!hubsEnv) {
    throw new Error('AMP_HUBS environment variable is missing.');
  }
  const hubNames = hubsEnv
    .split(',')
    .map(h => h.trim())
    .filter(Boolean);
  if (hubNames.length === 0) {
    throw new Error('AMP_HUBS must contain at least one hub name.');
  }
  const configs: Amplience.HubConfig[] = hubNames.map(envName => {
    const clientId = process.env[`AMP_${envName}_CLIENT_ID`];
    const clientSecret = process.env[`AMP_${envName}_HUB_SECRET`];
    const hubId = process.env[`AMP_${envName}_HUB_ID`];
    const name = process.env[`AMP_${envName}_HUB_NAME`];

    if (!clientId || !clientSecret || !hubId || !name) {
      throw new Error(
        `Missing credentials for hub: ${envName}. Expected AMP_${envName}_CLIENT_ID and AMP_${envName}_SECRET.`
      );
    }

    return { name, clientId, clientSecret, hubId };
  });

  return configs;
}

export { getHubConfigs };
