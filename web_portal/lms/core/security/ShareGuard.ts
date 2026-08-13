export class ShareGuard {
  static enable() {
    // In Web, we intercept attempts to use the native share API
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      // Overwrite the share method to throw an error or do nothing
      (navigator as any).share = async () => {
        console.warn('Sharing is disabled by security policy.');
        throw new Error('Sharing is disabled.');
      };
    }
  }
}
