export class LiveRecoveryManager {
  private maxRetries = 3;
  private retryDelay = 5000;
  private retries = 0;
  private onRecover: () => Promise<void>;

  constructor(onRecover: () => Promise<void>) {
    this.onRecover = onRecover;
  }

  async handleFailure(errorType: string) {
    console.warn(`[LiveRecoveryManager] Detected failure: ${errorType}`);
    
    if (this.retries < this.maxRetries) {
      this.retries++;
      console.log(`[LiveRecoveryManager] Attempting recovery ${this.retries}/${this.maxRetries} in ${this.retryDelay}ms`);
      
      setTimeout(async () => {
        try {
          await this.onRecover();
          // Reset retries if recovery was successful (which we assume if no throw)
          this.retries = 0;
        } catch (e) {
          console.error('[LiveRecoveryManager] Recovery attempt failed', e);
        }
      }, this.retryDelay);
    } else {
      console.error('[LiveRecoveryManager] Max recovery attempts reached. Please refresh the page manually.');
    }
  }

  reset() {
    this.retries = 0;
  }
}
