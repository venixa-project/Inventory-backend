export class AppError extends Error {
    statusCode;
    details;
    constructor(message, statusCode = 400, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export const errorHandler = (err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    if (statusCode >= 500) {
        console.error(`[Server Error] ${statusCode} - ${message}`, err.stack || err);
    }
    else {
        console.warn(`[Client ${statusCode}] ${message}`);
    }
    res.status(statusCode).json({
        success: false,
        error: message,
        details: err.details || undefined,
    });
};
