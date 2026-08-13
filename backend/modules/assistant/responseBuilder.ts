// Preserving all V1 types for backward compatibility, appending V2 interactive types
export type ResponseCardType = 'text' | 'faq' | 'resource_list' | 'live_classes' | 'attendance' | 'clarification' | 'table' | 'timeline' | 'action_card' | 'error' | 'empty';

export interface IAssistantAction {
  label: string;
  intent: string; // e.g., "/notes"
  type?: 'OPEN_RESOURCE' | 'DOWNLOAD' | 'FAVORITE' | 'JOIN_LIVE' | 'NAVIGATION'; // V2 Addition
}

export interface IAssistantResponse {
  type: ResponseCardType;
  title?: string;
  subtitle?: string;
  text?: string;
  items?: any[];
  actions?: IAssistantAction[];
  metadata?: any; // V2 Addition for analytics and explainability tracking
}

export class ResponseBuilder {
  static buildText(text: string, actions?: IAssistantAction[]): IAssistantResponse {
    return { type: 'text', text, actions };
  }

  static buildFAQ(question: string, answer: string): IAssistantResponse {
    return { type: 'faq', title: question, text: answer };
  }

  static buildResourceList(title: string, subtitle: string, items: any[]): IAssistantResponse {
    return { type: 'resource_list', title, subtitle, items };
  }

  static buildClarification(suggestions: { name: string, intentId: string }[]): IAssistantResponse {
    return {
      type: 'clarification',
      title: 'Did you mean...',
      actions: suggestions.map(s => ({ label: s.name, intent: `/intent ${s.intentId}` }))
    };
  }

  static buildUnanswered(): IAssistantResponse {
    return {
      type: 'text',
      text: "I couldn't find an exact match for your question in the Academy's Knowledge Base. I've logged this so our admins can add an answer soon!"
    };
  }

  // --- V2 Feature Additions (Backward Compatible) ---

  static buildActionCard(title: string, subtitle: string, actions: IAssistantAction[]): IAssistantResponse {
    return { type: 'action_card', title, subtitle, actions };
  }

  static buildTable(title: string, items: any[]): IAssistantResponse {
    return { type: 'table', title, items };
  }

  static buildError(message: string): IAssistantResponse {
    return { type: 'error', text: message };
  }
}
