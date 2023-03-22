const User = require('./../models/userModel');
const { promisify } = require('util');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const Email = require('../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  //remove password from response
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    user,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  //1. check email and password exist
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('please provide your email and password!', 400));
  }
  //2. check user exist and password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('incorrect email or password', 401));
  }

  //3. if every thing is ok, then send token to client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1.getting token and exist it
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(
      new AppError('you are not logged in!please log in to get access...', 401)
    );
  }
  //2.verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3.check exist user
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'the user belonging to this token does no longer exist!',
        401
      )
    );
  }

  //4.check user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError('user recently changed password. please log in again!', 401)
    );
  //added user to request for access it on next middleware function
  req.user = currentUser;
  //grant access to protected route
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //check current user has admin or lead-guide roles
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('you dont have permission to perform this action!', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1. get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('the user not fount this email!', 404));

  //2. generate and save the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3. send reset token to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'token sent to email',
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.save({ validateBeforeSave: false });

    return next(new AppError('there is an error for sending email!', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1. get user based on the token
  const resetToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: resetToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2. if user exist and the token does not expire, set new passeord
  if (!user) {
    return next(new AppError('the token invalid or expired!', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save();

  //3. update passwordChangedAt

  //4. send jwt token to user and login
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1. get user
  const user = await User.findById(req.user.id).select('+password');

  //2. check current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('the current password is wrong!', 401));
  }

  //3. change password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4. log in and send token
  createSendToken(user, 200, res);
});

exports.logout = (res, req) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
  });
};
