import { Router } from 'express';
import { KnowledgeBaseController } from './controller';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';

export const kbRoutes = Router();

// Only Admins manage Knowledge Base
kbRoutes.use(requireAuth, requireRole(['super_admin', 'admin', 'staff']));

// Intents
kbRoutes.get('/intents', KnowledgeBaseController.listIntents);
kbRoutes.post('/intents', KnowledgeBaseController.createIntent);
kbRoutes.put('/intents/:id', KnowledgeBaseController.updateIntent);
kbRoutes.delete('/intents/:id', KnowledgeBaseController.deleteIntent);

// Collections
kbRoutes.get('/collections', KnowledgeBaseController.listCollections);
kbRoutes.post('/collections', KnowledgeBaseController.createCollection);

// Articles
kbRoutes.get('/articles', KnowledgeBaseController.listArticles);
kbRoutes.post('/articles', KnowledgeBaseController.createArticle);
kbRoutes.put('/articles/:id', KnowledgeBaseController.updateArticle);
kbRoutes.delete('/articles/:id', KnowledgeBaseController.deleteArticle);

// Settings
kbRoutes.get('/settings', KnowledgeBaseController.getSettings);
kbRoutes.put('/settings', KnowledgeBaseController.updateSettings);

// Quick Actions
kbRoutes.get('/quick-actions', KnowledgeBaseController.listQuickActions);
kbRoutes.post('/quick-actions', KnowledgeBaseController.upsertQuickAction);
kbRoutes.put('/quick-actions/:id', KnowledgeBaseController.upsertQuickAction);
kbRoutes.delete('/quick-actions/:id', KnowledgeBaseController.deleteQuickAction);
