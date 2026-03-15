const LoggerMiddleware = (req, res, next) => {
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] ${req.method} request to ${req.url} - IP: ${req.ip}`);

    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${timestamp}] ${req.method} request to ${req.url} completed in ${duration}ms - Status: ${res.statusCode}`);   
    });

    next();
}

module.exports = LoggerMiddleware;