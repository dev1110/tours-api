const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');

const tourRouter = require('./routes/tour');
const userRouter = require('./routes/user');
const reviewRouter = require('./routes/review');
const AppError = require('./utils/appError');
const { errorHandler } = require('./utils/functions');

const app = express();
app.engine('pug', require('pug').__express)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// serrving local files on url/public
app.use(express.static(path.join(__dirname, 'public')));

// 1) MIDDLEWARES

// set secuirity http headers
app.use(helmet());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// 2) limit request rate from same client
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many req from this IP, please again in an hour'
});
app.use('/api', limiter);

// 3) Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Data sanitisation against NoSQL query injection
app.use(mongoSanitize());

// Data sanitisation against xss(html syntax)
app.use(xss());

// Prevent http parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

app.use((req, res, next) => {
  console.log('Hello from the middleware 👋');
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES
app.get('/', (req, res) => {
  res.render('base');
});

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', req => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

module.exports = app;
