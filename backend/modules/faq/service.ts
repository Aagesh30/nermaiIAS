import { FaqRepository } from './repository';
import { IFaq } from './types';
import { AppError } from '../../core/errors/AppError';

export class FaqService {
  private repo = new FaqRepository();

  async createFaq(data: any, adminId: string, tenantId: string): Promise<IFaq> {
    return this.repo.create({ ...data, tenantId }, adminId);
  }

  async listFaqs(tenantId: string): Promise<IFaq[]> {
    return this.repo.listForTenant(tenantId);
  }

  async updateFaq(id: string, data: Partial<IFaq>, adminId: string, tenantId: string): Promise<IFaq> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.tenantId !== tenantId) {
      throw new AppError('FAQ not found', 404);
    }
    await this.repo.update(id, data, adminId);
    return this.repo.findById(id) as Promise<IFaq>;
  }

  async deleteFaq(id: string, adminId: string, tenantId: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.tenantId !== tenantId) {
      throw new AppError('FAQ not found', 404);
    }
    await this.repo.delete(id, adminId);
  }
}
