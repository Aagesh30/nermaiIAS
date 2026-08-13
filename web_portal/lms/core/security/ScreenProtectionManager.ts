export class ScreenProtectionManager {
  private static blurElementId = 'screen-protection-blur';

  static enable() {
    if (typeof document === 'undefined') return;

    // Web deterrence: Listen for print-screen attempts or visibility changes
    document.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  static disable() {
    if (typeof document === 'undefined') return;

    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.removeBlur();
  }

  private static handleKeyUp = (e: KeyboardEvent) => {
    // Basic deterrence: if print screen is pressed
    if (e.key === 'PrintScreen') {
      this.applyBlur();
      setTimeout(() => this.removeBlur(), 3000);
    }
  };

  private static handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.applyBlur();
    } else {
      this.removeBlur();
    }
  };

  private static applyBlur() {
    if (!document.getElementById(this.blurElementId)) {
      const blurDiv = document.createElement('div');
      blurDiv.id = this.blurElementId;
      blurDiv.style.position = 'fixed';
      blurDiv.style.top = '0';
      blurDiv.style.left = '0';
      blurDiv.style.width = '100vw';
      blurDiv.style.height = '100vh';
      blurDiv.style.backgroundColor = 'rgba(0,0,0,0.95)';
      blurDiv.style.zIndex = '999999';
      blurDiv.style.display = 'flex';
      blurDiv.style.justifyContent = 'center';
      blurDiv.style.alignItems = 'center';
      blurDiv.style.color = 'red';
      blurDiv.style.fontSize = '24px';
      blurDiv.innerText = 'Security Warning: Screen recording/capture attempt detected.';
      document.body.appendChild(blurDiv);
    }
  }

  private static removeBlur() {
    const blurDiv = document.getElementById(this.blurElementId);
    if (blurDiv) {
      blurDiv.remove();
    }
  }
}
