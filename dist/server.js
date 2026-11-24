import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { autoInitializeDatabase } from './models/migrate.js';
// Reload trigger for persistent seed data: 2026-10-26
const app = createApp();
const primaryPort = parseInt(process.env.PORT || '8080', 10);
const server = app.listen(primaryPort, '0.0.0.0', async () => {
    console.log(`=======================================================`);
    console.log(`🚀 Venixa Inventory Backend running on port ${primaryPort}`);
    console.log(`🌐 Base URL: http://0.0.0.0:${primaryPort}/api/v1`);
    console.log(`🔒 Roles: Product Admin | Store Owner | Counter Staff`);
    console.log(`⚡ Environment: ${ENV.NODE_ENV}`);
    // Automatically bootstrap database, run migrations, and seed initial records
    try {
        await autoInitializeDatabase();
    }
    catch (err) {
        console.error('⚠️ [Startup] Database autoInitializeDatabase warning:', err.message);
    }
    console.log(`=======================================================`);
});
// Dual-port binding: Ensure port 8080 is always actively listening for Railway edge routing
if (primaryPort !== 8080) {
    try {
        app.listen(8080, '0.0.0.0', () => {
            console.log('🚀 Railway edge port 8080 listener active');
        });
    }
    catch { }
}
if (primaryPort !== 5000) {
    try {
        app.listen(5000, '0.0.0.0', () => {
            console.log('🚀 Port 5000 listener active');
        });
    }
    catch { }
}
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
