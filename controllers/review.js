const Review = require('../models/review');
const {
  handleDelete,
  handleUpdate,
  handleCreate,
  handleGet,
  handleGetAll
} = require('../utils/functions');

exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) {
    req.body.tour = req?.params?.tourId;
  }
  if (!req.body.user) {
    req.body.user = req?.user?._id;
  }
  next();
};

exports.getAll = handleGetAll(Review);

exports.get = handleGet(Review);

exports.create = handleCreate(Review);

exports.update = handleUpdate(Review);

exports.delete = handleDelete(Review);
