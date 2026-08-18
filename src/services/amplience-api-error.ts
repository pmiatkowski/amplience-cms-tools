export class AmplienceApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly statusText: string,
    details: string
  ) {
    super(`API Error: ${status} ${statusText} - ${details}`);
    this.name = 'AmplienceApiError';
  }
}
