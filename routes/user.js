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
router.patch('/change-password/', protect, updatePassword);

router.route('/me').get(protect, user.me, user.get);
router.route('/deactivate').delete(protect, user.deactivate);

router
  .route('/')
  .post(protect, user.create)
  .patch(protect, user.update)
  .delete(protect, restrictTo('admin'), user.delete);

router.route('/all').get(user.getAll);
router.route('/:id').get(protect, user.get);

module.exports = router;
