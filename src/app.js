const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');
const seederRoutes = require('./routes/seederRoutes');
const errorHandler = require('./middlewares/errorHandler');
const mongoSanitize = require('express-mongo-sanitize');
const fileUpload = require("express-fileupload");
const xss = require('xss-clean');
const hpp = require('hpp');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Use Helmet to secure headers
app.use(helmet());

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

app.all('/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  global.globalRequests = function () {
    return { req: req, requests: req.query && Object.keys(req.query).length > 0 ? req.query : req.body }
  }
  next();
});

// SECURITY: Hide "X-Powered-By" header
app.disable('x-powered-by');

// // Enforce HTTPS
// app.use((req, res, next) => {
//   if (req.headers['x-forwarded-proto'] !== 'https') {
//     return res.redirect(['https://', req.get('Host'), req.url].join(''));
//   }
//   next();
// });

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
// app.use(fileUpload());

// Routes
app.use('/v1', userRoutes);
app.use('/v1/seeder', seederRoutes);
app.use(errorHandler);

const sequelize = require('./config/database');
sequelize.sync()
  .then(() => console.log('Database connected'))
  .catch((err) => console.log('Error: ' + err));

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'local'
// let server = require("http").createServer(app);
// if (NODE_ENV != 'local') {
//   const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH
//   const CERTIFICATE_PATH = process.env.CERTIFICATE_PATH
//   // var privateKey = fs.readFileSync(PRIVATE_KEY_PATH);
//   var privateKey = fs.readFileSync('/ssl/privkey-wiz.pem');
//   var certificate = fs.readFileSync('/ssl/certificate-wiz.pem');
//   var credentials = {
//     key: privateKey,
//     cert: certificate,
//   };
//   server = require("https").createServer(credentials, app);
// }
// const socket = require("socket.io");
// const io = socket(server, {
//   cors: {
//     origin: "*"
//   }
// });
// require('./socketController/LogController')(io);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
