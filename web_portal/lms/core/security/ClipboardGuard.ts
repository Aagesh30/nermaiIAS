export class ClipboardGuard {
  static enable() {
    if (typeof document === 'undefined') return;

    document.addEventListener('copy', this.blockEvent);
    document.addEventListener('cut', this.blockEvent);
    document.addEventListener('contextmenu', this.blockEvent);
    document.addEventListener('selectstart', this.blockEvent);
  }

  static disable() {
    if (typeof document === 'undefined') return;

    document.removeEventListener('copy', this.blockEvent);
    document.removeEventListener('cut', this.blockEvent);
    document.removeEventListener('contextmenu', this.blockEvent);
    document.removeEventListener('selectstart', this.blockEvent);
  }

  private static blockEvent(e: Event) {
    e.preventDefault();
  }
}
