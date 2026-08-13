import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { IConversationSession } from '../types';
import { logger } from '../../../core/logger';

export class ConversationSessionManager {
  private collectionName = 'assistant_sessions';

  /**
   * Retrieves an existing session or creates a new one.
   * If a session hasn't been updated in 2 hours, it's considered expired 
   * and a new one is initialized to prevent stale context.
   */
  async getOrCreateSession(
    sessionId: string, 
    userId: string, 
    tenantId: string, 
    role: string
  ): Promise<IConversationSession> {
    const db = getFirestore();
    const docRef = db.collection(this.collectionName).doc(sessionId);
    
    try {
      const doc = await docRef.get();
      
      if (doc.exists) {
        const data = doc.data() as IConversationSession;
        // Check for 2-hour expiration
        if (Date.now() - data.updatedAt > 2 * 60 * 60 * 1000) {
          return this.initializeNewSession(sessionId, userId, tenantId, role);
        }
        return data;
      } else {
        return this.initializeNewSession(sessionId, userId, tenantId, role);
      }
    } catch (error) {
      logger.error('[SessionManager] Error fetching session', error);
      // Fallback to in-memory session if Firestore fails
      return this.createEmptySession(sessionId, userId, tenantId, role);
    }
  }

  /**
   * Updates the session with the latest query context.
   */
  async updateSession(
    sessionId: string, 
    updates: Partial<IConversationSession['context']>
  ): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection(this.collectionName).doc(sessionId);
    
    try {
      // In Firestore we merge deep fields by flattening them, but for simplicity here we assume standard updates
      const flatUpdates: Record<string, any> = { updatedAt: Date.now() };
      
      if (updates.navigation) {
        if (updates.navigation.activeScreen) flatUpdates['context.navigation.activeScreen'] = updates.navigation.activeScreen;
        if (updates.navigation.activeTab) flatUpdates['context.navigation.activeTab'] = updates.navigation.activeTab;
      }
      
      if (updates.conversation) {
        if (updates.conversation.lastIntent) flatUpdates['context.conversation.lastIntent'] = updates.conversation.lastIntent;
        if (updates.conversation.lastResource) flatUpdates['context.conversation.lastResource'] = updates.conversation.lastResource;
        if (updates.conversation.lastQuery) flatUpdates['context.conversation.lastQuery'] = updates.conversation.lastQuery;
      }

      await docRef.update(flatUpdates);
    } catch (error) {
      logger.error('[SessionManager] Error updating session', error);
    }
  }

  private async initializeNewSession(
    sessionId: string, 
    userId: string, 
    tenantId: string, 
    role: string
  ): Promise<IConversationSession> {
    const session = this.createEmptySession(sessionId, userId, tenantId, role);
    const db = getFirestore();
    await db.collection(this.collectionName).doc(sessionId).set(session);
    return session;
  }

  private createEmptySession(sessionId: string, userId: string, tenantId: string, role: string): IConversationSession {
    return {
      sessionId,
      userId,
      tenantId,
      role,
      context: {
        navigation: {},
        academic: {},
        conversation: {},
        user: { batchIds: [], permissions: [role] }
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
}

export const sessionManager = new ConversationSessionManager();
