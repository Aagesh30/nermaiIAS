export class ContextBuilder {
  buildContext(chunks: { text: string }[]): string {
    if (chunks.length === 0) return '';
    const combined = chunks.map(c => `- ${c.text}`).join('\n');
    return `Based on our academy records:\n${combined}`;
  }
}
