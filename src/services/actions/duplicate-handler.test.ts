import { describe, it, expect } from 'vitest';
import { generateUniqueDeliveryKey, generateUniqueLabel } from './duplicate-handler';

describe('generateUniqueLabel', () => {
  it('should append (1) when base label exists', () => {
    const result = generateUniqueLabel('My Item', ['My Item']);
    expect(result).toBe('My Item (1)');
  });

  it('should increment suffix when (1) already exists', () => {
    const result = generateUniqueLabel('My Item', ['My Item', 'My Item (1)']);
    expect(result).toBe('My Item (2)');
  });

  it('should strip existing suffix and re-count', () => {
    const result = generateUniqueLabel('My Item (1)', ['My Item', 'My Item (1)']);
    expect(result).toBe('My Item (2)');
  });
});

describe('generateUniqueDeliveryKey', () => {
  it('should append -1 when base key exists', () => {
    const result = generateUniqueDeliveryKey('my-key', ['my-key']);
    expect(result).toBe('my-key-1');
  });

  it('should increment suffix when -1 already exists', () => {
    const result = generateUniqueDeliveryKey('my-key', ['my-key', 'my-key-1']);
    expect(result).toBe('my-key-2');
  });
});
