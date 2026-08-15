import { LiveProvider } from './LiveProvider';

export class ProviderRegistry {
  private static providers = new Map<string, LiveProvider>();

  static registerProvider(name: string, provider: LiveProvider) {
    if (!name) return;
    this.providers.set(name.toLowerCase().trim(), provider);
  }

  private static ensureDefaults() {
    if (!this.providers.has('zoom')) {
      try {
        const { ZoomProvider } = require('./ZoomProvider');
        this.providers.set('zoom', new ZoomProvider());
      } catch (e: any) {
        console.error('[ProviderRegistry] Failed to auto-instantiate ZoomProvider:', e);
      }
    }
    if (!this.providers.has('youtube')) {
      try {
        const { YouTubeProvider } = require('./YouTubeProvider');
        this.providers.set('youtube', new YouTubeProvider());
      } catch (e: any) {
        console.error('[ProviderRegistry] Failed to auto-instantiate YouTubeProvider:', e);
      }
    }
  }

  static getProvider(name: string): LiveProvider {
    const key = (name || '').toLowerCase().trim();
    if (!this.providers.has(key)) {
      this.ensureDefaults();
    }
    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error(`Provider not registered: ${name}`);
    }
    return provider;
  }
}

