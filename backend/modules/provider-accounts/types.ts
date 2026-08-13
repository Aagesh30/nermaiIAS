export type ProviderStatus = 'healthy' | 'busy' | 'rate_limited' | 'disconnected' | 'credential_expired' | 'disabled';

export interface IProviderAccount {
  id?: string;
  displayName: string;
  provider: 'zoom' | 'google_meet' | 'youtube' | 'teams' | 'webex' | 'bbb';
  credentials: {
    clientId?: string;
    clientSecret?: string;
    accountId?: string;
    sdkKey?: string;
    sdkSecret?: string;
    hostKey?: string;
    refreshToken?: string;
    // Any other provider-specific encrypted secrets
  };
  status: ProviderStatus;
  priority: number;
  maxConcurrentMeetings: number;
  currentRunningMeetings: number;
  timezone?: string;
  region?: string;
  healthStatus: string;
  lastHealthCheck?: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  tenantId?: string; // Optional for multi-tenancy
}
