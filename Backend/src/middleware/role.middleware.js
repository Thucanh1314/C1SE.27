/**
 * Middleware to check if user has required role
 * @param {string[]} roles - Array of allowed roles
 */
module.exports = (roles) => {
    return (req, res, next) => {
        // Check if user is authenticated (should be used after auth middleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. User not authenticated.'
            });
        }

        // Check if user has one of the allowed roles
        if (roles.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: `Access denied. Requires one of the following roles: ${roles.join(', ')}`
            });
        }
    };
};
