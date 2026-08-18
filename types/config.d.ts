export interface ApplicationConfig {
  readonly contentTypeValidation: {
    /**
     * Stops content recreation when recursive reference discovery cannot complete.
     * Set to false to validate only known items and continue with references nullified.
     */
    readonly abortOnReferenceDiscoveryFailure: boolean;
  };
}
