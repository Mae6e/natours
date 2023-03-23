//rating , create at
const mongoose = require('mongoose');
const Tour = require('./../models/tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can no be empty!'],
    },
    rating: {
      type: Number,
      default: 0,
      min: [1, 'The rating value must be above 1.0!'],
      max: [5, 'The rating value must be blew 5.0!'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user!'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

//document middleware
reviewSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'name photo' });
  // .populate({
  //   path: 'tour',
  //   select: 'name',
  // });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const statistics = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (statistics.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: statistics[0].nRating,
      ratingsAverage: statistics[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// create new review
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
});

// update new review
// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //If you're absolutely sure you want to execute the
  //exact same query twice, you can use clone()
  this.r = await this.findOne().clone();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;