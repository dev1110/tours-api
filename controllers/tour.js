const Tour = require('../models/tour');
const AppError = require('../utils/appError');
const {
  catchAsync,
  handleDelete,
  handleUpdate,
  handleCreate,
  handleGet,
  handleGetAll
} = require('../utils/functions');

exports.getAll = handleGetAll(Tour);

exports.get = handleGet(Tour, { path: 'reviews' });

exports.create = handleCreate(Tour);

exports.update = handleUpdate(Tour);

exports.delete = handleDelete(Tour);

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: {
        ratingsAverage: { $gte: 4.5 }
      }
    },
    {
      $group: {
        // _id: null,
        // _id: '$difficulty',
        _id: { $toUpper: '$difficulty' },
        toursCount: {
          $sum: 1
        },
        numRating: {
          $sum: '$ratingsQuantity'
        },
        avgRating: {
          $avg: '$ratingsAverage'
        },
        avgPrice: {
          $avg: '$price'
        },
        minPrice: {
          $min: '$price'
        },
        maxPrice: {
          $max: '$price'
        }
      }
    },
    {
      $match: {
        _id: { $ne: 'EASY' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Fetched Successfully',
    data: stats
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = +req?.params?.year;
  const plans = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: {
          month: {
            $dateToString: {
              format: '%B',
              date: '$startDates'
            }
          },
          m: { $month: '$startDates' }
        },
        tourCount: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $sort: { '_id.m': 1 }
    },
    {
      $addFields: {
        month: '$_id.month'
      }
    },
    {
      $project: {
        _id: 0
      }
    }
  ]);
  res.status(200).json({
    status: 'success',
    message: 'Fetched Successfully',
    results: plans?.length,
    data: plans
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req?.params;
  // 31.099529, 77.158505
  const [lat, lng] = latlng?.split(',');

  if (!lat || !lng) {
    next(
      new AppError('Please provide lat and lng in the format of lat,lng', 400)
    );
  }
  const radius = +distance / (unit === 'mi' ? 3963.2 : 6378.1);
  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radius]
      }
    }
  });
  res.status(200).json({
    status: 'success',
    message: 'Fetched Successfully',
    results: tours?.length,
    data: tours
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req?.params;
  const [lat, lng] = latlng?.split(',');

  if (!lat || !lng) {
    next(
      new AppError('Please provide lat and lng in the format of lat,lng', 400)
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [+lng, +lat]
        },
        distanceField: 'distance',
        distanceMultiplier: unit === 'mi' ? 0.000621371 : 0.001
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);
  res.status(200).json({
    status: 'success',
    message: 'Fetched Successfully',
    results: distances?.length,
    data: distances
  });
});
