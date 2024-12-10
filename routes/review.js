const express = require('express');
const auth = require('../controllers/auth');
const review = require('../controllers/review');

const router = express.Router({ mergeParams: true });

router.use(auth.protect);
router
  .route('/')
  .get(review.getAll)
  .post(auth.restrictTo('user'), review.setTourUserIds, review.create);

router
  .route('/:id')
  .get(review.get)
  .patch(auth.restrictTo('admin', 'user'), review.update)
  .delete(auth.restrictTo('admin', 'user'), review.delete);

module.exports = router;
