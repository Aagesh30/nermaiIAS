import { randomUUID } from 'crypto';

export class StreamLogger {
  private session: any = {
    requestId: randomUUID(),
    startedAt: Date.now(),
    timings: {},
    counters: { chunks: 0, bytesSent: 0, chunkSizes: [] },
    headers: {},
    provider: '',
    speedLog: []
  };

  private enabled = process.env.DEBUG_RESOURCE_STREAMING === 'true' || process.env.NODE_ENV === 'development';

  constructor(public resourceId: string, public userId: string, public studentName: string) {
    this.session.resourceId = resourceId;
    this.session.userId = userId;
    this.session.studentName = studentName;
  }

  recordTiming(label: string, timeMs: number) {
    this.session.timings[label] = timeMs;
  }

  setProviderInfo(provider: string, size: number, mime: string, version: number, etag: string, rangeRequested?: string) {
    this.session.provider = provider;
    this.session.size = size;
    this.session.mime = mime;
    this.session.version = version;
    this.session.etag = etag;
    this.session.rangeRequested = rangeRequested;
  }

  recordChunk(size: number, timeMs: number) {
    this.session.counters.chunks++;
    this.session.counters.bytesSent += size;
    this.session.counters.chunkSizes.push(size);
    this.session.speedLog.push({ size, timeMs });
  }

  complete() {
    if (!this.enabled) return;

    const totalTime = Date.now() - this.session.startedAt;
    
    // Calculate speeds
    let avgSpeedStr = '0 MB/s', peakSpeedStr = '0 MB/s', lowSpeedStr = '0 MB/s';
    let avgChunkStr = '0 KB', largestChunkStr = '0 KB';
    
    if (this.session.counters.chunks > 0) {
      const avgChunk = this.session.counters.bytesSent / this.session.counters.chunks;
      const largestChunk = Math.max(...this.session.counters.chunkSizes);
      avgChunkStr = `${(avgChunk / 1024).toFixed(1)} KB`;
      largestChunkStr = `${(largestChunk / 1024).toFixed(1)} KB`;
      
      const speeds = this.session.speedLog.filter((l: any) => l.timeMs > 0).map((l: any) => (l.size / 1024 / 1024) / (l.timeMs / 1000));
      if (speeds.length > 0) {
        const avgSpeed = speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length;
        const peakSpeed = Math.max(...speeds);
        const lowSpeed = Math.min(...speeds);
        
        avgSpeedStr = `${avgSpeed.toFixed(1)} MB/s`;
        peakSpeedStr = `${peakSpeed.toFixed(1)} MB/s`;
        lowSpeedStr = `${lowSpeed.toFixed(1)} MB/s`;
      }
    }

    const t = this.session.timings;
    
    const color = (ms: number) => {
      if (!ms) return '';
      if (ms < 100) return '🟢';
      if (ms < 500) return '🟡';
      return '🔴';
    };

    console.log(`
======================================================
STREAM COMPLETED: Request ID [${this.session.requestId}]
======================================================
[Resource Info]
User      : ${this.session.studentName} (${this.session.userId})
Resource  : ${this.session.resourceId}
Provider  : ${this.session.provider}
Size      : ${(this.session.size / 1024 / 1024).toFixed(2)} MB
Version   : ${this.session.version}
Range     : ${this.session.rangeRequested || 'FULL'}

[Timings]
Lookup    : ${t.Lookup || 0} ms ${color(t.Lookup)}
Permission: ${t.Permission || 0} ms ${color(t.Permission)}
First Byte: ${t.FirstByte || 0} ms ${color(t.FirstByte)}
Total Time: ${(totalTime / 1000).toFixed(2)} sec ${color(totalTime)}

[Stream Statistics]
Chunks       : ${this.session.counters.chunks}
Avg Chunk    : ${avgChunkStr}
Largest Chunk: ${largestChunkStr}
Avg Speed    : ${avgSpeedStr}
Peak Speed   : ${peakSpeedStr}
Lowest Speed : ${lowSpeedStr}
======================================================
`);
  }
}
