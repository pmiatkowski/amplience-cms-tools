// Global type definitions for the Amplience CLI Tool

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AMP_HUBS: string;
      AMP_API_BASE_URL: string;
      AMP_RATE_LIMIT_DELAY: string;
      LOG_LEVEL: string;
      LOG_FILE: string;
      [key: string]: string | undefined;
    }
  }

  // Ensure Node.js globals are available
  var fetch: typeof globalThis.fetch;
  var console: Console;
  var Headers: typeof globalThis.Headers;
  var URLSearchParams: typeof globalThis.URLSearchParams;
}

export {};
