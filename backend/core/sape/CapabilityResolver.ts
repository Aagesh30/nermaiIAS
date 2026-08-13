import { IBatchCapabilities } from '../../modules/students/types';

export class CapabilityResolver {
  
  static readonly DEFAULT_CAPABILITIES: IBatchCapabilities = {
    canViewLive: false,
    canViewRecorded: false,
    canRequestRecorded: true,
    canRequestTopic: true,
    canRequestSubject: false,
    canRequestCourse: false
  };

  /**
   * Merges multiple batch capabilities using a Union strategy for booleans.
   * If a student belongs to multiple batches, and any batch allows an action,
   * the resulting capability will allow the action.
   */
  static mergeCapabilities(capabilitiesList: IBatchCapabilities[]): IBatchCapabilities {
    if (!capabilitiesList || capabilitiesList.length === 0) {
      return { ...this.DEFAULT_CAPABILITIES };
    }

    return capabilitiesList.reduce((acc, curr) => ({
      canViewLive: acc.canViewLive || curr.canViewLive,
      canViewRecorded: acc.canViewRecorded || curr.canViewRecorded,
      canRequestRecorded: acc.canRequestRecorded || curr.canRequestRecorded,
      canRequestTopic: acc.canRequestTopic || curr.canRequestTopic,
      canRequestSubject: acc.canRequestSubject || curr.canRequestSubject,
      canRequestCourse: acc.canRequestCourse || curr.canRequestCourse
    }), { ...this.DEFAULT_CAPABILITIES });
  }

  /**
   * Resolves quota limits by choosing the most permissive limit across batches.
   * null means unlimited. 
   */
  static resolveQuotas(limits: Array<number | null>): number | null {
    if (limits.length === 0) return 0;
    
    // If any limit is null, the result is unlimited
    if (limits.includes(null)) return null;

    // Otherwise, find the maximum limit
    return Math.max(...(limits as number[]));
  }
}
