import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  
  if (err.name === 'PrismaClientKnownRequestError') {
    // Check if the error is RLS related. Postgres row-level security policy violation
    if (err.code === 'P2004' || err.code === 'P2025') {
      return res.status(403).json({ error: 'Access denied by row-level security or record not found' });
    }
  }

  res.status(500).json({ error: 'Internal server error' });
}
