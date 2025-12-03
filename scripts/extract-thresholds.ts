import { readFileSync, appendFileSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join(process.cwd(), 'vitest.config.ts');

try {
  const content = readFileSync(CONFIG_PATH, 'utf-8');

  // Regex to find the thresholds object
  // Matches: thresholds: { ... }
  const thresholdsMatch = content.match(/thresholds:\s*{([^}]+)}/s);

  if (!thresholdsMatch) {
    console.error('Could not find thresholds in vitest.config.ts');
    process.exit(1);
  }

  const thresholdsContent = thresholdsMatch[1];

  const metrics = ['lines', 'statements', 'functions', 'branches'];
  const results: Record<string, string> = {};

  metrics.forEach(metric => {
    const metricMatch = thresholdsContent.match(new RegExp(`${metric}:\\s*(\\d+)`));
    if (metricMatch) {
      results[metric] = metricMatch[1];
    } else {
      console.warn(`Could not find threshold for ${metric}`);
      results[metric] = '0';
    }
  });

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    Object.entries(results).forEach(([key, value]) => {
      appendFileSync(process.env.GITHUB_OUTPUT!, `${key}=${value}\n`);
    });
  } else {
    // Fallback for local testing
    console.log(JSON.stringify(results, null, 2));
  }
} catch (error) {
  console.error('Error reading vitest.config.ts:', error);
  process.exit(1);
}
