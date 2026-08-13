import { Request, Response, NextFunction } from 'express';
import { WatchHistoryRepository } from './repository';
import * as Validators from './validator';

const watchRepo = new WatchHistoryRepository();

export const updateProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.id as string;
    const { userId } = req.user!;
    
    const parsedData = Validators.updateProgressSchema.parse(req.body);

    await watchRepo.upsert(userId, classId, parsedData);
    
    res.status(200).json({ status: 'success', message: 'Progress updated' });
  } catch (error) { next(error); }
};

export const getProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.id as string;
    const { userId } = req.user!;
    
    const progress = await watchRepo.getProgress(userId, classId);
    
    res.status(200).json({ status: 'success', data: progress || { position: 0, completed: false } });
  } catch (error) { next(error); }
};
