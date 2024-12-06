const APIFeatures = require('./apiFeatures');
const AppError = require('./appError');

const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateValueDB = err => {
  const value = err?.errorResponse?.errmsg?.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err?.errors)?.map(el => el?.message);
  const message = `Invalide input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const errorHandler = (err, req, res, next) => {
  //   console.log('err.stack', err?.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    // if (error?.name === 'CastError') error = handleCastErrorDB(error);
    if (error?.kind === 'ObjectId') error = handleCastErrorDB(error);
    if (error?.code === 11000) error = handleDuplicateValueDB(error);
    if (error?.name === 'JsonWebTokenError')
      error = new AppError('Invalid token. Please login again', 401);
    if (error?.name === 'TokenExpiredError')
      error = new AppError('Session Expired. Please login again', 401);
    if (error?.name === 'ValidationError')
      error = handleValidationErrorDB(error);

    res.status(error?.isOperational ? error.statusCode : 500).json({
      status: error?.isOperational ? error.status : 'error',
      message: error?.isOperational ? error.message : 'Something went wrong!'
    });
  }
};

const handleDelete = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('No document found with this Id', 404));
    }
    res.status(200).json({
      message: 'Deleted successfully.',
      status: 'success',
      data: null
    });
  });

const handleUpdate = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!doc) {
      return next(new AppError('No document found with this Id', 404));
    }
    res.status(200).json({
      status: 'success',
      message: 'Updated successfully.',
      data: doc
    });
  });

const handleCreate = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      data: doc,
      message: 'Created successfully.',
      status: 'success'
    });
  });

const handleGet = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req?.params?.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      data: doc,
      message: 'Fetched successfully.',
      status: 'success'
    });
  });

const handleGetAll = Model =>
  catchAsync(async (req, res, next) => {
    let filters = {};
    if (req?.params?.tourId) filters.tour = req.params.tourId;
    
    const features = new APIFeatures(Model.find(filters), req?.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // execute query
    const docs = await features?.query;

    res.status(200).json({
      status: 'success',
      results: docs.length,
      message: 'Fetched successfully.',
      data: docs
    });
  });

module.exports = {
  catchAsync,
  errorHandler,
  handleDelete,
  handleUpdate,
  handleCreate,
  handleGet,
  handleGetAll
};
