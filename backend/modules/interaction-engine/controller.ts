// @ts-nocheck
import { Request, Response } from 'express';

export const postInteraction = async (req: Request, res: Response) => {
  res.json({ success: true });
};

export const streamInteractions = async (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('data: connected\n\n');
};
