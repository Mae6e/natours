const AppError = require('./../utils/appError');

const handelCastErrorDB = (err) => {
  const message = `invalid ${err.path}:${err.value}`;
  return new AppError(message, 400);
};
const handelDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `dupicate field value: ${value}. please use another value!`;
  return new AppError(message, 400);
};

const handelValidationFieldsDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `invalid data input! ${errors.join(', ')}`;
  return new AppError(message, 400);
};

const handelJWTError = () =>
  new AppError('Invalid token. please login again!', 401);

const handelJWTExpiredError = () =>
  new AppError('Token Expired! please login agian', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  //Operational ,Trusted Error : send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  //Programming ,Unknown Error : Dont leak error  details
  else {
    // 1.Log error
    console.log('Error', err);

    // 2.Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.log(process.env.NODE_ENV);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.name = err.name;
    error.errmsg = err.errmsg;
    error.message = err.message;

    if (error.name === 'CastError') error = handelCastErrorDB(error);
    else if (error.code === 11000) error = handelDuplicateFieldsDB(error);
    else if (error.name === 'ValidationError')
      error = handelValidationFieldsDB(error);
    else if (error.name === 'JsonWebTokenError') error = handelJWTError();
    else if (error.name === 'TokenExpiredError')
      error = handelJWTExpiredError();

    sendErrorProd(error, res);
  }
};
