import winston from 'winston';

const isDev = process.env.NODE_ENV !== 'production';

const fileTransportOpts = { dirname: 'logs', maxsize: 10 * 1024 * 1024, maxFiles: 5 };

const createServiceLogger = (serviceName: string): winston.Logger => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.File({ ...fileTransportOpts, filename: `${serviceName}.log` }),
      new winston.transports.File({ ...fileTransportOpts, filename: `${serviceName}-error.log`, level: 'error' })
    ]
  });

  if (logger.transports.length === 0 || isDev) {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  return logger;
};

export const logger = createServiceLogger('automation-service');
export { createServiceLogger };
export default logger;
