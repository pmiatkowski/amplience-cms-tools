import { describe, expect, it } from 'vitest';
import { applicationConfig } from './config';

describe('applicationConfig', () => {
  it('aborts when reference discovery fails by default', () => {
    expect(applicationConfig.contentTypeValidation.abortOnReferenceDiscoveryFailure).toBe(true);
  });
});
