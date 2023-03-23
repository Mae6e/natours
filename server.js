const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('uncought exception. shutting down server...');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

//console.log(app.get('env'));
//console.log(process.env);

const options = {
  autoIndex: true, //this is the code I added that solved it all
  family: 4, // Use IPv4, skip trying IPv6
};

const DB = process.env.DATABASE_LOCAL;
mongoose.set('strictQuery', false);
mongoose
  .connect(DB, options)
  .then(() => {
    console.log('DB Connection Successful!');
  })
  .catch((err) => console.log(err));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App runnig on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('unhandled rejection promise. shutting down server...');
  server.close(() => {
    process.exit(1);
  });
});
