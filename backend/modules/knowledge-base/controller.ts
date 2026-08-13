import { Request, Response, NextFunction } from 'express';
import { KnowledgeBaseService } from './service';

const kbService = new KnowledgeBaseService();

export class KnowledgeBaseController {
  // Intents
  static async createIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = req.user!;
      const intent = await kbService.createIntent(req.body, userId, tenantId);
      res.status(201).json({ status: 'success', data: intent });
    } catch (err) { next(err); }
  }

  static async listIntents(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const intents = await kbService.listIntents(tenantId);
      res.status(200).json({ status: 'success', data: intents });
    } catch (err) { next(err); }
  }

  static async updateIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const id = req.params.id as string;
      await kbService.updateIntent(id, req.body, userId);
      res.status(200).json({ status: 'success' });
    } catch (err) { next(err); }
  }

  static async deleteIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await kbService.deleteIntent(id);
      res.status(200).json({ status: 'success' });
    } catch (err) { next(err); }
  }

  // Collections
  static async createCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = req.user!;
      const collection = await kbService.createCollection(req.body, userId, tenantId);
      res.status(201).json({ status: 'success', data: collection });
    } catch (err) { next(err); }
  }

  static async listCollections(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const collections = await kbService.listCollections(tenantId);
      res.status(200).json({ status: 'success', data: collections });
    } catch (err) { next(err); }
  }

  // Articles
  static async createArticle(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = req.user!;
      const article = await kbService.createArticle(req.body, userId, tenantId);
      res.status(201).json({ status: 'success', data: article });
    } catch (err) { next(err); }
  }

  static async listArticles(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const articles = await kbService.listArticles(tenantId);
      res.status(200).json({ status: 'success', data: articles });
    } catch (err) { next(err); }
  }

  static async updateArticle(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      const id = req.params.id as string;
      await kbService.updateArticle(id, req.body, userId);
      res.status(200).json({ status: 'success' });
    } catch (err) { next(err); }
  }

  static async deleteArticle(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await kbService.deleteArticle(id);
      res.status(200).json({ status: 'success' });
    } catch (err) { next(err); }
  }

  // Settings
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const settings = await kbService.getSettings(tenantId);
      res.status(200).json({ status: 'success', data: settings });
    } catch (err) { next(err); }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = req.user!;
      await kbService.updateSettings(tenantId, req.body, userId);
      res.status(200).json({ status: 'success' });
    } catch (err) { next(err); }
  }

  // Quick Actions
  static async listQuickActions(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const actions = await kbService.listQuickActions(tenantId);
      res.status(200).json({ status: 'success', data: actions });
    } catch (err) { next(err); }
  }

  static async upsertQuickAction(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = req.user!;
      await kbService.upsertQuickAction(tenantId, req.body, userId);
      res.status(200).json({ status: 'success' });
    } catch (err) { next(err); }
  }

  static async deleteQuickAction(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await kbService.deleteQuickAction(id);
      res.status(200).json({ status: 'success' });
    } catch (err) { next(err); }
  }
}
