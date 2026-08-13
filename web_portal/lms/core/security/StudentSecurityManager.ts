import { ClipboardGuard } from './ClipboardGuard';
import { ShareGuard } from './ShareGuard';
import { ScreenProtectionManager } from './ScreenProtectionManager';

export class StudentSecurityManager {
  static init() {
    ClipboardGuard.enable();
    ShareGuard.enable();
    ScreenProtectionManager.enable();

    // Prevent iframe embedding of this site from other domains (clickjacking defense)
    if (window.top !== window.self) {
      window.top!.location.href = window.self.location.href;
    }
  }

  static destroy() {
    ClipboardGuard.disable();
    ScreenProtectionManager.disable();
  }
}
