import { LiveProvider } from './LiveProvider';

export class ProviderRegistry {
  private static providers = new Map<string, LiveProvider>();

  static registerProvider(name: string, provider: LiveProvider) {
    this.providers.set(name, provider);
  }

  static getProvider(name: string): LiveProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not registered: ${name}`);
    }
    return provider;
  }
}
