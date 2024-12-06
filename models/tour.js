const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./user');

const tourSchema = new mongoose.Schema(
  {
    cover: {
      type: String,
      required: [true, 'Tour must have a cover image']
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    description: {
      type: String,
      trim: true
    },
    difficulty: {
      type: String,
      required: [true, 'Tour must have a difficulty level'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message:
          'Difficulty level can only be either: easy, medium or difficult'
      }
    },
    duration: {
      type: Number,
      required: [true, 'Tour must have a duration']
    },
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ],
    images: [String],
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    maxGroupSize: {
      type: Number,
      required: [true, 'Tour must have a group size']
    },
    name: {
      type: String,
      required: [true, 'Tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [
        40,
        'A tour name must have less than or equal to 40 characters'
      ],
      minlength: [
        10,
        'A tour name must have more than or equal to 10 characters'
      ]
    },
    price: { type: Number, required: [true, 'Tour must have a price'] },
    priceDiscount: {
      type: Number,
      validate: {
        // this only points to current doc on new document creation
        validator: function(val) {
          return val < this.price;
        },
        message: `Discount price ({VALUE}) should be below regular price`
      }
    },
    rating: { type: Number, default: 4.5 },
    ratingsAverage: {
      type: Number,
      min: [1, 'average rating should be greater than 0'],
      max: [5, 'average rating should be leass than 5']
    },
    ratingsQuantity: Number,
    // reviews: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'Review'
    //   }
    // ],
    slug: String,
    startDates: [Date],
    startLocation: {
      // GeoJSONt
      type: {
        type: String,
        defalult: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A short summary is required for a tour']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

// Document middleware:  runs before .save() and .create()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });
// Document middleware:  runs after .save() and .create()
tourSchema.post('save', function(doc, next) {
  next();
});

// Query middleware
tourSchema.pre(/^find/, function(next) {
  this.start = Date.now();
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  next();
});
tourSchema.post(/^find/, function(doc, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  next();
});

const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
