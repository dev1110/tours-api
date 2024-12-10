const express = require('express');
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  updatePassword,
  protect,
  restrictTo
} = require('../controllers/auth');
const user = require('../controllers/user');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);

// adding protect middleware for all the routes after this point
router.use(protect);

router.patch('/change-password/', updatePassword);
router.route('/me').get(user.me, user.get);
router.route('/deactivate').delete(user.deactivate);

// routes only admin can access
router.use(restrictTo('admin'));

router
  .route('/')
  .get(user.getAll)
  .post(user.create)
  .patch(user.update)
  .delete(user.delete);

router.route('/:id').get(user.get);

module.exports = router;
