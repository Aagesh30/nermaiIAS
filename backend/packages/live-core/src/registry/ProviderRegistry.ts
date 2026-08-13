import { LiveMeetingProvider } from './LiveMeetingProvider';

export class ProviderRegistry {
  private static providers = new Map<string, LiveMeetingProvider>();

  static registerProvider(name: string, provider: LiveMeetingProvider) {
    this.providers.set(name, provider);
  }

  static getProvider(name: string): LiveMeetingProvider | undefined {
    return this.providers.get(name);
  }

  static removeProvider(name: string) {
    this.providers.delete(name);
  }
}
