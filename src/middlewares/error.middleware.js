// Runs when no route matched.
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: method:${req.method} api-endpoint:${req.originalUrl}`,
  });
};

// Runs when any route throws. It must have exactly four parameters,
// that is how Express knows it is an error handler.
export const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.status ? err.message : "Something went wrong on the server.",
  });
};
