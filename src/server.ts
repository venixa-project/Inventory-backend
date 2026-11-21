import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { autoInitializeDatabase } from './models/migrate.js';

// Reload trigger for persistent seed data: 2026-10-26
const app = createApp();

const server = app.listen(ENV.PORT, '0.0.0.0', async () => {
  console.log(`=======================================================`);
  console.log(`🚀 Venixa Inventory Backend running on port ${ENV.PORT}`);
  console.log(`🌐 Base URL: http://0.0.0.0:${ENV.PORT}/api/v1`);
  console.log(`🔒 Roles: Product Admin | Store Owner | Counter Staff`);
  console.log(`⚡ Environment: ${ENV.NODE_ENV}`);

  // Automatically bootstrap database, run migrations, and seed initial records
  try {
    await autoInitializeDatabase();
  } catch (err: any) {
    console.error('⚠️ [Startup] Database autoInitializeDatabase warning:', err.message);
  }

  console.log(`=======================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
