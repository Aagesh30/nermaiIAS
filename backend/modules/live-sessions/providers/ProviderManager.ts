import { LiveProvider } from './LiveProvider';
import { ProviderRegistry } from './ProviderRegistry';

export const ProviderCapabilities: Record<string, any> = {
  zoom: {
    hasWaitingRoom: true,
    hasSDK: true,
    hasBreakoutRooms: true,
    hasRecording: true,
    hasAttendance: true
  },
  google_meet: {
    hasWaitingRoom: false,
    hasSDK: false,
    hasBreakoutRooms: false,
    hasRecording: true,
    hasAttendance: true
  },
  youtube: {
    hasWaitingRoom: false,
    hasSDK: false,
    hasBreakoutRooms: false,
    hasRecording: false,
    hasAttendance: false,
    isLiveStream: true
  },
  upload: {
    hasWaitingRoom: false,
    hasSDK: false,
    hasBreakoutRooms: false,
    hasRecording: false,
    hasAttendance: false
  }
};

export class ProviderManager {
  static getProvider(providerName: string): LiveProvider {
    // Normalize aliases
    if (providerName === 'zoom_live') providerName = 'zoom';
    if (providerName === 'youtube_live' || providerName === 'youtube_recorded') providerName = 'youtube';
    
    return ProviderRegistry.getProvider(providerName);
  }

  static getCapabilities(providerName: string) {
    if (providerName === 'zoom_live') providerName = 'zoom';
    if (providerName === 'youtube_live' || providerName === 'youtube_recorded') providerName = 'youtube';
    return ProviderCapabilities[providerName] || ProviderCapabilities.youtube; // generic fallback
  }

  static getAllCapabilities() {
    return ProviderCapabilities;
  }

  static async createMeeting(providerName: string, config: any) {
    const provider = this.getProvider(providerName);
    return await provider.createSession(config);
  }
}
