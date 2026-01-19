import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

function getHubConfigs(): Amplience.HubConfig[] {
  const patToken = process.env.PAT_TOKEN;
  const configs: Amplience.HubConfig[] = [];
  const hubNames = new Set<string>();

  // Scan environment variables for AMP_HUB_ prefixed variables
  Object.keys(process.env).forEach(key => {
    const match = key.match(/^AMP_HUB_([A-Z0-9_]+)_HUB_ID$/);
    if (match) {
      hubNames.add(match[1]);
    }
  });

  // If PAT_TOKEN is present, use it for all discovered hubs
  if (patToken && patToken.trim()) {
    hubNames.forEach(hubName => {
      const hubId = process.env[`AMP_HUB_${hubName}_HUB_ID`];
      const name = process.env[`AMP_HUB_${hubName}_HUB_NAME`];
      const extUrl = process.env[`AMP_HUB_${hubName}_EXT_URL`];
      if (hubId && name) {
        const config: Amplience.HubConfig = { name, envKey: hubName, hubId, patToken };
        if (extUrl) {
          config.extUrl = extUrl;
        }
        configs.push(config);
      } else {
        console.warn(
          `Incomplete configuration for hub "${hubName}". Missing one or more of: ` +
            `AMP_HUB_${hubName}_HUB_ID, AMP_HUB_${hubName}_HUB_NAME`
        );
      }
    });
    if (configs.length === 0) {
      throw new Error(
        'No complete hub configurations found. Please ensure you have configured at least one hub ' +
          'with all required environment variables: AMP_HUB_<HUBNAME>_HUB_ID, AMP_HUB_<HUBNAME>_HUB_NAME'
      );
    }

    return configs;
  }

  // Fallback to OAuth (clientId/clientSecret) if PAT_TOKEN is not present
  hubNames.forEach(hubName => {
    const clientId = process.env[`AMP_HUB_${hubName}_CLIENT_ID`];
    const clientSecret = process.env[`AMP_HUB_${hubName}_CLIENT_SECRET`];
    const hubId = process.env[`AMP_HUB_${hubName}_HUB_ID`];
    const name = process.env[`AMP_HUB_${hubName}_HUB_NAME`];
    const extUrl = process.env[`AMP_HUB_${hubName}_EXT_URL`];

    if (clientId && clientSecret && hubId && name) {
      const config: Amplience.HubConfig = { name, envKey: hubName, clientId, clientSecret, hubId };
      if (extUrl) {
        config.extUrl = extUrl;
      }
      configs.push(config);
    } else {
      console.warn(
        `Incomplete configuration for hub "${hubName}". Missing one or more of: ` +
          `AMP_HUB_${hubName}_CLIENT_ID, AMP_HUB_${hubName}_CLIENT_SECRET, ` +
          `AMP_HUB_${hubName}_HUB_ID, AMP_HUB_${hubName}_HUB_NAME`
      );
    }
  });

  if (configs.length === 0) {
    throw new Error(
      'No complete hub configurations found. Please ensure you have configured at least one hub ' +
        'with all required environment variables: AMP_HUB_<HUBNAME>_CLIENT_ID, ' +
        'AMP_HUB_<HUBNAME>_CLIENT_SECRET, AMP_HUB_<HUBNAME>_HUB_ID, AMP_HUB_<HUBNAME>_HUB_NAME or PAT_TOKEN with AMP_HUB_<HUBNAME>_HUB_ID, AMP_HUB_<HUBNAME>_HUB_NAME'
    );
  }

  return configs;
}

export { getHubConfigs };
