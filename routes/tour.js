const express = require('express');
const auth = require('./../controllers/auth');
const tour = require('./../controllers/tour');
const review = require('./../controllers/review');
const reviewRouter = require('./../routes/review');

const router = express.Router();

router.route('/top-5-cheap').get(tour.aliasTopTours, tour.getAll);
router.route('/stats').get(tour.getTourStats);
router.route('/monthly-plan/:year').get(tour.getMonthlyPlan);
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tour.getToursWithin);
router
  .route('/distances/:latlng/unit/:unit')
  .get(tour.getDistances);

router
  .route('/')
  .get(tour.getAll)
  .post(auth.protect, auth.restrictTo('admin', 'lead-guide'), tour.create);

router.use('/:tourId/reviews', reviewRouter);

router
  .route('/:id')
  .get(tour.get)
  .patch(auth.protect, auth.restrictTo('admin', 'lead-guide'), tour.update)
  .delete(auth.protect, auth.restrictTo('admin', 'lead-guide'), tour.delete);

module.exports = router;
