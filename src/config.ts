import type { ApplicationConfig } from '../types/config';

export const applicationConfig: ApplicationConfig = {
  contentTypeValidation: {
    /**
     * Stops content recreation when recursive reference discovery cannot complete.
     * Set to false to validate only known items and continue with references nullified.
     */
    abortOnReferenceDiscoveryFailure: true,
  },
};
