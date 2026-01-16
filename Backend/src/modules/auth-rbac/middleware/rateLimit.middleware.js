const rateLimitMap = new Map();

/**
 * Clean up old entries every 10 minutes
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitMap.entries()) {
        if (now > data.resetTime) {
            rateLimitMap.delete(key);
        }
    }
}, 10 * 60 * 1000);

/**
 * Basic In-Memory Rate Limiter
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per window
 * @param {string} options.message - Error message
 */
const rateLimiter = (options = {}) => {
    const windowMs = options.windowMs || 15 * 60 * 1000; // Default 15 mins
    const max = options.max || 5; // Default 5 attempts
    const message = options.message || 'Too many requests, please try again later.';

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        // If email is provided in body, use it as part of key to prevent brute force on specific account
        const key = req.body.email ? `${ip}_${req.body.email}` : ip;

        const now = Date.now();
        const record = rateLimitMap.get(key);

        if (!record) {
            rateLimitMap.set(key, {
                count: 1,
                resetTime: now + windowMs
            });
            return next();
        }

        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
            rateLimitMap.set(key, record);
            return next();
        }

        record.count += 1;
        rateLimitMap.set(key, record);

        if (record.count > max) {
            return res.status(429).json({
                success: false,
                message: message
            });
        }

        next();
    };
};

module.exports = rateLimiter;
