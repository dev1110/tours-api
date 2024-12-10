const User = require('../models/user');
const AppError = require('../utils/appError');
const {
  catchAsync,
  handleDelete,
  handleGetAll,
  handleGet
} = require('../utils/functions');

exports.getAll = handleGetAll(User);

exports.get = handleGet(User);

// using signup function to create user in auth controller
exports.create = (req, res, next) => {
  res.status(201).json({
    status: 'success',
    message: 'User created successfully!'
    // data: users
  });
};

exports.update = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return new AppError('This route is not for password change', 400);
  }
  const filteredBody = Object.fromEntries(
    Object.entries(req?.body).filter(([key]) => ['name', 'email'].includes(key))
  );
  const user = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully!',
    data: user
  });
});

exports.delete = handleDelete(User);

// logged in user actions
exports.me = (req, res, next) => {
  req.params.id = req?.user?._id;
  next();
};

exports.deactivate = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });
  res.status(204).json({
    status: 'success',
    message: 'User deleted successfully!',
    data: null
  });
});
