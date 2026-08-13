import { IInteraction, InteractionContext } from '@nermai/types';
import { InteractionApi, SendInteractionParams } from '../api/InteractionApi';
import { InteractionReducers } from '../core/reducers';

// Since we cannot import React, this is a pure Vanilla JS state manager.
// A wrapper in apps/web or apps/mobile will consume this via `useEffect` or `useState`.

export interface IInteractionAdapter {
  connectStream(url: string, onMessage: (data: any) => void): void;
  disconnectStream(): void;
  enqueueOffline(params: SendInteractionParams): void;
  dequeueOffline(): SendInteractionParams[];
  isOnline(): boolean;
}

export class InteractionStateManager {
  private context: InteractionContext;
  private api: InteractionApi;
  private adapter: IInteractionAdapter;
  
  public messages: IInteraction[] = [];
  public questions: IInteraction[] = [];
  
  private listeners: Set<() => void> = new Set();

  constructor(context: InteractionContext, api: InteractionApi, adapter: IInteractionAdapter) {
    this.context = context;
    this.api = api;
    this.adapter = adapter;
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public connect(baseUrl: string) {
    const url = `${baseUrl}/api/v1/interaction/stream/${this.context.tenantId}/${this.context.contextType}/${this.context.contextId}`;
    this.adapter.connectStream(url, (data: any) => {
      this.handleIncomingEvent(data);
    });
  }

  public disconnect() {
    this.adapter.disconnectStream();
  }

  private handleIncomingEvent(event: any) {
    if (event.interactionType === 'CHAT') {
      this.messages = InteractionReducers.addOrUpdateMessage(this.messages, event as IInteraction);
    } else if (event.interactionType === 'QUESTION') {
      this.questions = InteractionReducers.addOrUpdateMessage(this.questions, event as IInteraction);
    } else if (event.interactionType === 'DELETE') {
      this.messages = InteractionReducers.deleteMessage(this.messages, event.payload.interactionId);
      this.questions = InteractionReducers.deleteMessage(this.questions, event.payload.interactionId);
    }
    // Handle REACTION, etc.
    this.notify();
  }

  public async sendMessage(payload: Record<string, any>) {
    const params: SendInteractionParams = {
      context: this.context,
      interactionType: 'CHAT',
      payload
    };

    if (!this.adapter.isOnline()) {
      this.adapter.enqueueOffline(params);
      return;
    }

    try {
      // Optimistic update could go here
      await this.api.send(params);
    } catch (error) {
      this.adapter.enqueueOffline(params);
    }
  }

  public async sendQuestion(payload: Record<string, any>) {
    const params: SendInteractionParams = {
      context: this.context,
      interactionType: 'QUESTION',
      payload
    };

    if (!this.adapter.isOnline()) {
      this.adapter.enqueueOffline(params);
      return;
    }
    await this.api.send(params);
  }
}
