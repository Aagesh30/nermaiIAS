import { IInteraction, InteractionContext, InteractionAttachment, InteractionReference, InteractionEventType } from '@nermai/types';

export interface SendInteractionParams {
  context: InteractionContext;
  interactionType: InteractionEventType;
  payload: Record<string, any>;
  attachments?: InteractionAttachment[];
  reference?: InteractionReference;
  parentId?: string;
}

/**
 * Platform adapter interface that must be implemented by Web and Mobile
 */
export interface IInteractionHttpAdapter {
  post<T>(url: string, data: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
  put<T>(url: string, data: any): Promise<T>;
}

export class InteractionApi {
  private httpAdapter: IInteractionHttpAdapter;
  private baseUrl: string;

  constructor(httpAdapter: IInteractionHttpAdapter, baseUrl: string = '/api/v1/interaction') {
    this.httpAdapter = httpAdapter;
    this.baseUrl = baseUrl;
  }

  async send(params: SendInteractionParams): Promise<IInteraction> {
    return this.httpAdapter.post<IInteraction>(this.baseUrl, params);
  }

  async edit(interactionId: string, payload: Record<string, any>): Promise<IInteraction> {
    return this.httpAdapter.put<IInteraction>(`${this.baseUrl}/${interactionId}`, { payload });
  }

  async delete(interactionId: string): Promise<void> {
    return this.httpAdapter.delete<void>(`${this.baseUrl}/${interactionId}`);
  }

  async react(interactionId: string, emoji: string): Promise<void> {
    // In our architecture, reactions might go to a generic endpoint or a specific one
    return this.httpAdapter.post<void>(`${this.baseUrl}/${interactionId}/react`, { emoji });
  }
}
