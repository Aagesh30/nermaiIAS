import winston from 'winston';
import { env } from '../../config/env';

// Structured JSON format for production (easy parsing for ELK, Datadog, etc)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Human readable format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    let msg = `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`;
    // If there's extra meta like requestId or module, append it nicely
    const meta: Record<string, any> = { ...info };
    delete meta.timestamp;
    delete meta.level;
    delete meta.message;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const winstonLogger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
});

export const logger = {
  info: (message: string, meta?: any) => winstonLogger.info(message, meta),
  error: (message: string, meta?: any) => winstonLogger.error(message, meta),
  warn: (message: string, meta?: any) => winstonLogger.warn(message, meta),
  debug: (message: string, meta?: any) => winstonLogger.debug(message, meta),
};
