// Wraps an async route handler so a rejected promise reaches Express's
// error middleware instead of crashing the process.
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
