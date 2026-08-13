import { Request, Response, NextFunction } from 'express';
import { FaqService } from './service';
import * as Validators from './validator';

const faqService = new FaqService();

export const createFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = Validators.createFaqSchema.parse(req.body);
    const { userId, tenantId } = (req as any).user;
    const faq = await faqService.createFaq(parsedData, userId, tenantId);
    res.status(201).json({ status: 'success', data: faq });
  } catch (error) { next(error); }
};

export const listFaqs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = (req as any).user;
    const faqs = await faqService.listFaqs(tenantId);
    res.status(200).json({ status: 'success', data: faqs });
  } catch (error) { next(error); }
};

export const updateFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const parsedData = Validators.updateFaqSchema.parse(req.body);
    const { userId, tenantId } = (req as any).user;
    const faq = await faqService.updateFaq(id, parsedData, userId, tenantId);
    res.status(200).json({ status: 'success', data: faq });
  } catch (error) { next(error); }
};

export const deleteFaq = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId, tenantId } = (req as any).user;
    await faqService.deleteFaq(id, userId, tenantId);
    res.status(200).json({ status: 'success', message: 'FAQ deleted successfully' });
  } catch (error) { next(error); }
};
