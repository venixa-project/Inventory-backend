import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './routes/index.js';
import { errorHandler, AppError } from './middlewares/error.middleware.js';


export const createApp = (): Express => {
  const app = express();

  // 1. Universal CORS middleware: guarantees preflight OPTIONS always return 204 with full headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-user-role, x-tenant-id, Accept, Origin, X-Requested-With'
    );
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Standard production security & utility middlewares
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-tenant-id', 'Accept', 'Origin', 'X-Requested-With'],
    })
  );
  app.options('*', cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(morgan('dev'));

  // Root welcome
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: 'Venixa Enterprise Multi-Role Inventory API',
      documentation: '/api/v1/health',
      supportedRoles: {
        product_admin: 'Platform & Client Management Hub',
        owner: 'Store Owner full inventory, vendor ledger & analytics',
        staff: 'Counter Staff POS checkout, barcode & daily shifts',
      },
    });
  });

  // Mount API
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter); // Alias

  // 404 Route handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Resource endpoint '${req.originalUrl}' not found on this server.`, 404));
  });

  // Centralized Error handler
  app.use(errorHandler);

  return app;
};
