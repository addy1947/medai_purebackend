export const sendResponse = (res, statusCode, success, message, data = null) => {
  return res.status(statusCode).json({
    success,
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString()
  });
};

export const sendError = (res, statusCode = 500, message = 'Internal Server Error', error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && error && { error: error.message }),
    timestamp: new Date().toISOString()
  });
};

export const sendSuccess = (res, message = 'Operation successful', data = null) => {
  return sendResponse(res, 200, true, message, data);
};

export const sendCreated = (res, message = 'Resource created successfully', data = null) => {
  return sendResponse(res, 201, true, message, data);
};

export const sendNotFound = (res, message = 'Resource not found') => {
  return sendResponse(res, 404, false, message);
};

export const sendBadRequest = (res, message = 'Bad request') => {
  return sendResponse(res, 400, false, message);
};

export const sendUnauthorized = (res, message = 'Unauthorized access') => {
  return sendResponse(res, 401, false, message);
};

export const sendForbidden = (res, message = 'Access forbidden') => {
  return sendResponse(res, 403, false, message);
};