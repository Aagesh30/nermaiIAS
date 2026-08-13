import { EventEmitter } from 'events';
import { ClassEventPayloads } from './ClassEvents';
import { AttendanceEventPayloads } from './AttendanceEvents';

export * from './ClassEvents';
export * from './AttendanceEvents';

export interface AllEventPayloads extends ClassEventPayloads, AttendanceEventPayloads {}

export class PlatformEventBus extends EventEmitter {
  emitEvent<K extends keyof AllEventPayloads>(event: K, payload: AllEventPayloads[K]): boolean {
    return this.emit(event as string, payload);
  }

  onEvent<K extends keyof AllEventPayloads>(event: K, listener: (payload: AllEventPayloads[K]) => void): this {
    return this.on(event as string, listener);
  }
}

export const platformEvents = new PlatformEventBus();
