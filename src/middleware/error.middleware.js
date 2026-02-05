const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500

  res.status(statusCode).json({
    success: err.success ?? false,
    statusCode,
    message: err.message,
    errors: err.errors || [],
    ...(process.env.NODE_ENV === "dev" && {
      stack: err.stack,
      isOperational: err.isOperational
    })
  })
}
export default errorHandler