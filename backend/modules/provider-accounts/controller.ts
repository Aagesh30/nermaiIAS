import { Request, Response } from 'express';
import { ProviderAccountService } from './service';
import { logger } from '../../core/logger';
import { AppError } from '../../core/errors/AppError';

export class ProviderAccountController {
  static async listAccounts(req: Request, res: Response) {
    try {
      const { tenantId } = req.user!;
      const accounts = await ProviderAccountService.listAccounts(tenantId);
      res.status(200).json({ success: true, data: accounts });
    } catch (error: any) {
      logger.error('Error listing provider accounts:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const account = await ProviderAccountService.getAccountById(id as string);
      if (!account) throw new AppError('Account not found', 404);
      res.status(200).json({ success: true, data: account });
    } catch (error: any) {
      logger.error('Error getting provider account:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async createAccount(req: Request, res: Response) {
    try {
      const { tenantId, userId } = req.user!;
      const data = { ...req.body, tenantId, createdBy: userId, isActive: true, currentRunningMeetings: 0 };
      const account = await ProviderAccountService.createAccount(data);
      res.status(201).json({ success: true, data: account });
    } catch (error: any) {
      logger.error('Error creating provider account:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async updateAccount(req: Request, res: Response) {
    try {
      const { userId } = req.user!;
      const { id } = req.params;
      const data = { ...req.body, updatedBy: userId };
      await ProviderAccountService.updateAccount(id as string, data);
      res.status(200).json({ success: true, message: 'Account updated successfully' });
    } catch (error: any) {
      logger.error('Error updating provider account:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async deleteAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await ProviderAccountService.deleteAccount(id as string);
      res.status(200).json({ success: true, message: 'Account deleted successfully' });
    } catch (error: any) {
      logger.error('Error deleting provider account:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }
}
