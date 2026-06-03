const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`;

    if (process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
      console.log(logEntry);
    } else if (res.statusCode >= 400) {
      console.error(logEntry);
    }
  });

  next();
};

module.exports = { requestLogger };
