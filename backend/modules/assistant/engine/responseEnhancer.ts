import { IAssistantResponse } from '../responseBuilder';
import { IConversationSession } from '../types';

export class ResponseEnhancer {
  
  /**
   * The final step in the V2 Knowledge Engine Pipeline.
   * 
   * Currently: Acts as a deterministic pass-through, simply forwarding the 
   * structured JSON cards built by the search and plugin layers.
   * 
   * Future (MCP/LLM Ready): This layer can intercept the structured cards 
   * and pass them to an external LLM (OpenAI, Gemini) as "context", 
   * asking the LLM to generate a natural, conversational wrapper around the data.
   */
  async enhance(
    rawResponse: IAssistantResponse, 
    session: IConversationSession
  ): Promise<IAssistantResponse> {
    
    // Future Feature Flag: if (settings.enableGenerativeAI) { ... call OpenAI ... }

    // Add diagnostic explainability metadata (invisible to user, useful for analytics)
    return {
      ...rawResponse,
      metadata: {
        enhancedVia: 'deterministic',
        sessionId: session.sessionId,
        contextUsed: {
          screen: session.context.navigation.activeScreen,
          role: session.role
        }
      }
    };
  }
}

export const responseEnhancer = new ResponseEnhancer();
