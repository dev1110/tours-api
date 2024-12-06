const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const { catchAsync } = require('../utils/functions');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process?.env?.JWT_SECRET, {
    expiresIn: process?.env?.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  delete user?.password;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: user
  });
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req?.user?.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.signup = catchAsync(async (req, res, next) => {
  const data = {
    name: req.body?.name,
    email: req?.body?.email,
    password: req?.body?.password,
    passwordConfirm: req?.body?.passwordConfirm,
    role: req?.body?.role
  };
  const newUser = await User.create(data);

  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    message: 'Account created successfully!',
    token,
    data: newUser
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const data = {
    email: req?.body?.email,
    password: req?.body?.password
  };
  // 1) check if email and password exists
  if (!data?.email || !data?.password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) check if user exists and password is correct
  const user = await User.findOne({ email: data?.email }).select('+password');
  const correct = await user?.correctPassword(data?.password, user.password);

  if (!user || !correct) {
    return next(new AppError('Incorrect email or password', 400));
  }

  // 3) send token to client
  const token = signToken(user._id);
  res.status(201).json({
    status: 'success',
    message: 'Login successful!',
    token
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) getting token and check if it's there
  let token;
  if (
    req?.headers?.authorization &&
    req?.headers?.authorization?.startsWith('Bearer')
  ) {
    token = req.headers.authorization?.split(' ')[1];
  }
  if (!token) {
    return next(new AppError('You are not logged in. Please log in', 401));
  }
  // 2) verification token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3) check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('User no longer exists.', 401));
  }

  //  4) check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed the password. Please log in again',
        401
      )
    );
  }

  // 5) grant access to the protected route
  req.user = currentUser;
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with this email address', 404));
  }

  // 2) generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and confirm password to ${resetURL}.\nIf you didn't forget your password, please ignore this email.`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 minutes)',
      message
    });
    res.status(200).json({
      message: 'Token sent to email.',
      status: 'success'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later.',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req?.params?.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) if token has not expired and user exists, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) update changedPasswordAt property for the user
  // 4) log the user in, send JWT
  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    message: 'Password reset successfully',
    token
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  if (!req.body.currentPassword) {
    return next(new AppError('Please provide current password', 400));
  }
  // 1) get the user from collection
  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError('User no longer exists.', 401));
  }
  // 2) check if the current password is correct
  const correct = await user.correctPassword(
    req.body.currentPassword,
    user.password
  );
  if (!correct) {
    return next(new AppError('Please provide correct current password', 400));
  }

  // 3) if so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) log user in, send jwt
  const token = await signToken(user._id);
  res.status(200).json({
    status: 'success',
    message: 'Your password has been changed successfully.',
    token
  });
});
