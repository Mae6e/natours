const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'The tour must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'A tour name must have less or equal 40 charachters!'],
      minLength: [10, 'A tour name must have more or equal 10 charachters!'],
      // validate: [
      //   validator.isAlpha,
      //   'The tour name must contain alphabet characters!',
      // ],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'The tour must have a duration'],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'The rating value must be above 1.0!'],
      max: [5, 'The rating value must be blew 5.0!'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    difficulty: {
      type: String,
      trim: true,
      required: [true, 'The tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'The difficulty is either: easy, medium, difficult',
      },
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'The tour must have a group size'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //this only for new doc on create documentation
          return val < this.price;
        },
        message: 'The discount price({VALUE}) should be less than price!',
      },
    },
    price: {
      type: Number,
      required: [true, 'The tour must have a price'],
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'The tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'The tour must have a image cover'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      // select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeekly').get(function () {
  return this.duration / 7;
});

//VIRTUAL POPULATE
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//DUCUMENT MIDDLEWAR OR HOOKS: run before save() and create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { toLower: true });
  next();
});

// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

//QUERY MIDDLEWARE OR HOOKS
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   console.log(`middleware took ${Date.now() - this.start} milliseconds!`);
//   next();
// });

//AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
