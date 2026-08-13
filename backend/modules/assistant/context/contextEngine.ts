import { IConversationSession } from '../types';

export class ContextEngine {
  /**
   * Evaluates the current session context to determine the implied scope of a query.
   * e.g., if the user says "Open it", this engine looks at conversation.lastResource.
   */
  public analyzeContext(query: string, session: IConversationSession) {
    const normalized = query.toLowerCase();
    const contextModifiers = {
      targetScopeId: null as string | null,
      targetScopeType: null as string | null,
      impliedAction: null as string | null,
      isFollowUp: false
    };

    // 1. Conversation Context (Follow-ups)
    if (normalized.includes('it') || normalized.includes('this') || normalized.includes('that')) {
      if (session.context.conversation.lastResource) {
        contextModifiers.targetScopeId = session.context.conversation.lastResource;
        contextModifiers.targetScopeType = 'RESOURCE';
        contextModifiers.isFollowUp = true;
      }
    }

    if (normalized.includes('previous') || normalized.includes('last one')) {
      if (session.context.conversation.lastQuery) {
        contextModifiers.isFollowUp = true;
        // In a real implementation, we'd pull the actual result ID from the session stack
      }
    }

    // 2. Academic Context (Implicit scoping)
    if (normalized.includes('my notes') || normalized.includes('this class')) {
      if (session.context.academic.topicId) {
        contextModifiers.targetScopeId = session.context.academic.topicId;
        contextModifiers.targetScopeType = 'TOPIC';
      } else if (session.context.academic.subjectId) {
        contextModifiers.targetScopeId = session.context.academic.subjectId;
        contextModifiers.targetScopeType = 'SUBJECT';
      } else if (session.context.academic.courseId) {
        contextModifiers.targetScopeId = session.context.academic.courseId;
        contextModifiers.targetScopeType = 'COURSE';
      }
    }

    // 3. Navigation Context (Where are they right now?)
    if (normalized.includes('here') || normalized.includes('current')) {
      if (session.context.navigation.activeScreen === 'LiveClasses') {
        contextModifiers.targetScopeType = 'LIVE_SESSION';
      } else if (session.context.navigation.activeScreen === 'Resources') {
        contextModifiers.targetScopeType = 'RESOURCE';
      }
    }

    return contextModifiers;
  }
}

export const contextEngine = new ContextEngine();
