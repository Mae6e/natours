const express = require('express');
const router = express.Router();
const bookingController = require('./../controllers/bookingController');
const authController = require('./../controllers/authController');
const factory = require('./../controllers/handlerFactory');

// router
//   .route('/')
//   .get(
//     bookingController.createBookingCheckout,
//     bookingController.getAllBookings
//   );

router.use(authController.protect);

router.route('/').get(bookingController.getAllBookings);

router.use(authController.restrictTo('admin', 'lead-guide'));

router
  .route('/:id')
  .get(bookingController.getBokking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
