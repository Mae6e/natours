const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');

const userRouter = require('./routes/userRoutes');
const tourRouter = require('./routes/tourRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const AppError = require('./utils/appError');
const errorController = require('./controllers/errorController');

const app = express();

// 1) GLOBAL MIDDLEWARES

//serving the static files
// app.set('view engine', 'pug');
// app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

//set security http headers
app.use(helmet());

//development logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

//limit requests from same api
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'too many requests from this Ip. please try agian in an hour!',
});
app.use('/api', limiter);

// body parser. reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

//data sanitization against nosql query injection
app.use(mongoSanitize());

//data sanitization against xss
app.use(xss());

//prevent parameter polution
app.use(hpp({ whitelist: ['duration'] }));

//compression middleware for compress text response
app.use(compression());

//test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 2) ROUTE HANDLERS

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// 3) ROUTES

// app.use('/', (req, res) => {
//   res.status(200).render('base');
// });

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `The ${req.originalUrl} can not find on this server!`,
  // });

  // const err = new Error(`The ${req.originalUrl} can not find on this server!`);
  // err.statusCode = 404;
  // err.status = 'faild';
  // next(err);
  next(
    new AppError(`The ${req.originalUrl} can not find on this server!`, 404)
  );
});

app.use(errorController);

module.exports = app;
