import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId: string;
        role: string;
        programMemberships: any[];
        studentId?: string | null;
        currentBatchId?: string;
        name?: string;
        email?: string;
        username?: string;
        sessionId?: string;
        accessContext?: {
          batchIds: string[];
          courseIds: string[];
          topicIds?: string[];
        };
      };
      requestId?: string;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
      tenantId: string;
      role: string;
      programMemberships: any[];
      studentId?: string | null;
      currentBatchId?: string;
      name?: string;
      email?: string;
      username?: string;
      sessionId?: string;
      accessContext?: {
        batchIds: string[];
        courseIds: string[];
        topicIds?: string[];
      };
    };
    requestId?: string;
  }
}

