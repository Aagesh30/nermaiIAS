import { synonymDictionary } from './synonymDictionary';
import { IConversationSession } from '../types';
import { assistantSettings } from '../settings/assistantSettings';

export interface IIntentResult {
  intent: string;
  confidence: number;
}

export class IntentEngine {
  
  /**
   * Deterministically classifies the user query into a known intent, 
   * calculating a confidence score based on keywords, regex, and synonyms.
   */
  async detectIntent(query: string, session: IConversationSession, tenantId: string): Promise<IIntentResult> {
    const normalized = query.toLowerCase().trim();
    
    // 1. Slash Commands (Exact overrides)
    if (normalized.startsWith('/')) {
      const command = normalized.substring(1).split(' ')[0];
      return { intent: command.toUpperCase(), confidence: 100 };
    }

    // 2. Fetch Base Intent from Synonym Dictionary
    const baseIntent = synonymDictionary.findBaseIntent(normalized);
    let confidence = 0;
    let selectedIntent = 'GENERAL_SEARCH';

    if (baseIntent) {
      selectedIntent = baseIntent;
      confidence = 60; // Base score for a synonym match
    }

    // 3. Regex Patterns for specific intents
    const faqPattern = /^(how to|what is|explain|why|can i|help me|guide)/i;
    if (faqPattern.test(normalized)) {
      if (selectedIntent === 'GENERAL_SEARCH' || selectedIntent === 'FAQ') {
        selectedIntent = 'FAQ';
        confidence += 30; 
      }
    }

    const commandPattern = /^(open|show|go to|navigate|download|join|start)/i;
    if (commandPattern.test(normalized)) {
      // If they say "open", it's highly likely an ACTION command, boosting confidence of the target
      confidence += 20; 
    }

    // 4. Context Bias
    // If they ask a vague question but are currently looking at a live session, bias towards LIVE
    if (session.context.navigation.activeScreen === 'LiveClasses' && selectedIntent === 'GENERAL_SEARCH') {
      selectedIntent = 'LIVE_SESSION';
      confidence += 20;
    }

    // If it's a follow-up ("open it"), inherit previous intent
    if ((normalized.includes('it') || normalized.includes('this')) && session.context.conversation.lastIntent) {
      selectedIntent = session.context.conversation.lastIntent;
      confidence = 95;
    }

    // Normalize confidence
    confidence = Math.min(confidence, 100);

    const settings = await assistantSettings.getSettings(tenantId);
    if (confidence < settings.intentThresholds.minimumConfidence) {
      return { intent: 'GENERAL_SEARCH', confidence };
    }

    return { intent: selectedIntent, confidence };
  }
}

export const intentEngine = new IntentEngine();
