const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

process.on('unhandledRejection', err => {
  console.log('err', err.name, err.message);
  console.log('Unhandeled Rejection 💥 Shutting Down.');
  server.close(() => {
    process.exit(1);
  });
});
process.on('uncaughtException', err => {
  console.log('Uncaught Exception 💥 Shutting Down.');
  console.log('err', err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

mongoose
  .connect(DB, {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => console.log('DB connection successful!'))
  .catch(err => console.log('DB connection error!', err));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
