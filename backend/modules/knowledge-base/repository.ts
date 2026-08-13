import { getFirestore } from 'firebase-admin/firestore';
import { IIntent, IKnowledgeArticle, IKnowledgeCollection, IAssistantSettings, IAssistantQuickAction } from './types';

export class KnowledgeBaseRepository {
  private db = getFirestore();

  // Intents
  async createIntent(intent: IIntent): Promise<IIntent> {
    const docRef = this.db.collection('intent_dictionary').doc();
    const newIntent = { ...intent, id: docRef.id, createdAt: new Date().toISOString() };
    await docRef.set(newIntent);
    return newIntent;
  }

  async listIntents(tenantId: string): Promise<IIntent[]> {
    const snapshot = await this.db.collection('intent_dictionary')
      .where('tenantId', '==', tenantId)
      .get();
    return snapshot.docs.map(doc => doc.data() as IIntent);
  }

  async updateIntent(id: string, updates: Partial<IIntent>): Promise<void> {
    await this.db.collection('intent_dictionary').doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteIntent(id: string): Promise<void> {
    await this.db.collection('intent_dictionary').doc(id).delete();
  }

  // Knowledge Collections
  async createCollection(collection: IKnowledgeCollection): Promise<IKnowledgeCollection> {
    const docRef = this.db.collection('kb_collections').doc();
    const newCol = { ...collection, id: docRef.id, createdAt: new Date().toISOString() };
    await docRef.set(newCol);
    return newCol;
  }

  async listCollections(tenantId: string): Promise<IKnowledgeCollection[]> {
    const snapshot = await this.db.collection('kb_collections')
      .where('tenantId', '==', tenantId)
      .get();
    return snapshot.docs.map(doc => doc.data() as IKnowledgeCollection);
  }

  // Knowledge Articles
  async createArticle(article: IKnowledgeArticle): Promise<IKnowledgeArticle> {
    const docRef = this.db.collection('kb_articles').doc();
    const newArticle = { 
      ...article, 
      id: docRef.id, 
      version: 1, // initialize version
      createdAt: new Date().toISOString() 
    };
    await docRef.set(newArticle);
    return newArticle;
  }

  async listArticles(tenantId: string): Promise<IKnowledgeArticle[]> {
    const snapshot = await this.db.collection('kb_articles')
      .where('tenantId', '==', tenantId)
      .get();
    return snapshot.docs.map(doc => doc.data() as IKnowledgeArticle);
  }

  async updateArticle(id: string, updates: Partial<IKnowledgeArticle>, userId: string): Promise<void> {
    const docRef = this.db.collection('kb_articles').doc(id);
    
    await this.db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('Article not found');
      
      const current = doc.data() as IKnowledgeArticle;
      
      // Auto-increment version if content changes or status goes to published
      let nextVersion = current.version || 1;
      if (updates.status === 'published' && current.status !== 'published') {
         nextVersion += 1;
      }
      
      transaction.update(docRef, {
        ...updates,
        version: nextVersion,
        updatedBy: userId,
        updatedAt: new Date().toISOString()
      });
    });
  }

  async deleteArticle(id: string): Promise<void> {
    await this.db.collection('kb_articles').doc(id).delete();
  }

  // Settings
  async getSettings(tenantId: string): Promise<IAssistantSettings | null> {
    const doc = await this.db.collection('assistant_settings').doc(tenantId).get();
    if (!doc.exists) return null;
    return doc.data() as IAssistantSettings;
  }

  async upsertSettings(tenantId: string, settings: Partial<IAssistantSettings>): Promise<void> {
    await this.db.collection('assistant_settings').doc(tenantId).set(
      { ...settings, tenantId, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }

  // Quick Actions
  async listQuickActions(tenantId: string): Promise<IAssistantQuickAction[]> {
    const snapshot = await this.db.collection('assistant_quick_actions')
      .where('tenantId', '==', tenantId)
      .orderBy('order', 'asc')
      .get();
    return snapshot.docs.map(doc => doc.data() as IAssistantQuickAction);
  }

  async upsertQuickAction(action: Partial<IAssistantQuickAction>): Promise<void> {
    const ref = action.id 
      ? this.db.collection('assistant_quick_actions').doc(action.id)
      : this.db.collection('assistant_quick_actions').doc();
      
    await ref.set({
      ...action,
      id: ref.id,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  async deleteQuickAction(id: string): Promise<void> {
    await this.db.collection('assistant_quick_actions').doc(id).delete();
  }
}
