//  Generic success response
 const successResponse = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

//  Generic error response
 const errorResponse = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};


 const notFoundResponse = (res, message, statusCode = 404, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    // errors,
  });
};


 const badRequestResponse = (res, message, statusCode = 400) => {
   return res.status(statusCode).json({
     success: false,
     message,
   });
 };

const accountDeactiveResponse = (res, message, statusCode = 423) => {
  return res.status(statusCode).json({
    success: false,
    message,
    is_active: false, 
  });
};



  const notificationResponse = (res, message, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
     
    });
  };


// ✅ Common responses
// 200 OK
 const ok = (res, data = {}, message = "Request successful") => {
  return successResponse(res, message, data, 200);
};

// 201 Created
 const created = (res, data = {}, message = "Resource created successfully") => {
  return successResponse(res, message, data, 201);
};

// 400 Bad Request
 const badRequest = (res, message = "Bad request", errors = null) => {
  return errorResponse(res, message, 400);
};

// 401 Unauthorized
 const unauthorized = (res, message = "Unauthorized access") => {
  return errorResponse(res, message, 401);
};

// 403 Forbidden
 const forbidden = (res, message = "Forbidden") => {
  return errorResponse(res, message, 403);
};

// 500 Internal Server Error
 const serverError = (res, message = "Internal server error", errors = null) => {
  return errorResponse(res, message, 500, errors);
};

// 503 Service Unavailable
 const serviceUnavailable = (res, message = "Service unavailable") => {
  return errorResponse(res, message, 503);
};



 export default { ok, created, badRequest, unauthorized,notFoundResponse, forbidden, serverError, serviceUnavailable, accountDeactiveResponse, notificationResponse, badRequestResponse };