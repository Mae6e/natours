const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');
const User = require('./../../models/userModel');
const Review = require('./../../models/reviewModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE_LOCAL;
const options = {
  autoIndex: true, //this is the code I added that solved it all
  family: 4, // Use IPv4, skip trying IPv6
};

mongoose.set('strictQuery', false);
mongoose.connect(DB, options).then(() => {
  console.log('DB Connection Successful!');
});

let tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours.json`, {
    encoding: 'utf-8',
  })
);

let users = JSON.parse(
  fs.readFileSync(`${__dirname}/users.json`, {
    encoding: 'utf-8',
  })
);

let reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, {
    encoding: 'utf-8',
  })
);

//import data into DB
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);

    console.log('data loaded successfuly!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

//delete all data from DB
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();

    console.log('data delete successfuly!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '__import') {
  importData();
} else if (process.argv[2] === '__delete') {
  deleteData();
}

//console.log(process.argv);
