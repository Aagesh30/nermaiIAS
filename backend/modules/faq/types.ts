import { BaseAuditFields } from '../../core/types';

export interface IFaq extends BaseAuditFields {
  id?: string;
  tenantId: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  status: 'published' | 'draft';
}
