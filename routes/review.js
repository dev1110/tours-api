const express = require('express');
const auth = require('../controllers/auth');
const review = require('../controllers/review');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(auth.protect, review.getAll)
  .post(
    auth.protect,
    auth.restrictTo('user'),
    review.setTourUserIds,
    review.create
  );

router
  .route('/:id')
  .get(auth.protect, review.get)
  .patch(auth.protect, review.update)
  .delete(auth.protect, auth.restrictTo('admin', 'user'), review.delete);

module.exports = router;
