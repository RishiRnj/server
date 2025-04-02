
// //app.js
// const dotenv = require('dotenv').config();
// const connectDB = require('./config/dbConfig') // load database controler configuration
// const port = process.env.PORT || 5000;
// const express = require('express');
// const rateLimit = require("express-rate-limit");
// const morgan = require('morgan');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');
// const cors = require('cors');

// // Middleware
// const passport = require('passport'); // Import Passport from the library
// require('./config/passport'); // Load Passport strategy configurations

// const app = express();

// // Define the rate limit (e.g., 100 requests per 15 minutes)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000, // Limit each IP to 100 requests per windowMs
//   message: {
//     status: 429,
//     message: "Too many requests from this IP, please try again later."
//   },
//   standardHeaders: true, // Return rate limit info in the RateLimit-* headers
//   legacyHeaders: false, // Disable the X-RateLimit-* headers
// });

// // Apply the rate limiter to all requests
// app.use(limiter);

// // Enable CORS
// app.use(cors({
//   origin: process.env.BASE_URL_FE, // Frontend URL
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true, // Allow cookies
//   allowedHeaders: ['Authorization', 'Content-Type', 'Cache-Control'], // Allowed headers in requests
// }));

// app.options('*', cors()); // Handle all OPTIONS requests

// // Connect to MongoDB
// connectDB();

// // Body parser middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   if (!res.headersSent) {
//     res.status(500).json({ msg: "Internal Server Error" });
//   }
// });


// // Logging
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

// // Session middleware
// app.use(session({
//   secret: 'keyboard cat',
//   resave: false,
//   saveUninitialized: true,
//   store: new MongoStore({
//     mongoUrl: process.env.MONGO_URI // Specify the MongoDB connection string
//   })
// }));


// // // Passport middleware
// app.use(passport.initialize());
// app.use(passport.session());

// // Routes via middleware
// app.use('/auth', require("./routes/authRoutes")); // Load auth routes
// app.use('/forum', require("./routes/forum"));
// app.use('/contactFrm', require("./routes/contact"));
// app.use('/user', require("./routes/user"));
// app.use('/survey', require("./routes/survey"));
// app.use('/api/notices', require("./routes/noticeRoutes"));
// app.use('/api/posts', require("./routes/post"));




// // // Routes
// // app.get('/', (req, res) => {
// //   res.status(200).json("Server Start")
// // });


// // Start the server
// app.listen(port, () => {
//   console.log(`Server running in ${process.env.NODE_ENV} mode on port http://localhost:${port}`);
// });

const dotenv = require('dotenv').config();
const connectDB = require('./config/dbConfig'); // Load database controller configuration
const port = process.env.PORT || 5000;
const express = require('express');
const cookieParser = require('cookie-parser');

const rateLimit = require("express-rate-limit");
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const http = require("http");
const WebSocket = require("ws");
const attachWebSocket = require('./middlewares/wsK');
const jwt = require('jsonwebtoken');
const { User } = require('./models/User'); // Adjust the path to your User model

// Middleware
const passport = require('passport'); // Import Passport
require('./config/passport'); // Load Passport strategy configurations

const app = express();

// Connect to MongoDB
connectDB();
const server = http.createServer(app); // Create HTTP server for both Express and WebSocket

// WebSocket server setup
const wss = new WebSocket.Server({ server });



// WebSocket connection handler
// WebSocket Authentication Middleware 

//need to start after completed all other component
wss.on('connection', async (ws, req) => {
  const token = req.url.split('?token=')[1]; // Assuming the token is passed as a query parameter

  if (!token) {
      ws.close(1008, 'Authentication token is required');
      return;
  }

  try {
      // Verify token and get user information
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token in app:', decoded);
      const user = await User.findById(decoded.id);
      console.log("token", user,);
      if (!user) {
          ws.close(1008, 'Invalid token');
          return;
          
          
      }

      // Assign the userId to the WebSocket client
      ws.userId = user.id.toString();
      console.log(`WebSocket connected for user: ${ws.userId}`);
  } catch (error) {
      console.error('WebSocket authentication failed:', error.message);
      ws.close(1008, 'Invalid or expired token');
  }

  // Handle incoming messages (if needed)
  ws.on('message', (message) => {
      console.log(`Message from user ${ws.userId}:`, message);
  });

  // Handle connection close
  ws.on('close', () => {
      console.log(`WebSocket disconnected for user: ${ws.userId}`);
  });
});

// Attaching WebSocket instance to Express app
attachWebSocket(app, wss);




// Middleware and Configurations
app.use(express.json());
app.use(cookieParser()); // ✅ Enable cookie parsing
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP
  message: { status: 429, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS Configuration
app.use(cors({
  origin: process.env.BASE_URL_FE, // Frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type', 'Cache-Control'],
}));



// Session and Passport
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
}));
app.use(passport.initialize());
app.use(passport.session());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/auth', require("./routes/authRoutes"));
app.use('/forum', require("./routes/forum"));
app.use('/contactFrm', require("./routes/contact"));
app.use('/user', require("./routes/user"));
app.use('/survey', require("./routes/survey"));
app.use('/api/notices', require("./routes/noticeRoutes"));
app.use('/api/posts', require("./routes/post"));
app.use('/api/joinUs', require("./routes/joinUs"));
app.use('/api/beneficiary', require("./routes/beneficiary"));
app.use('/api/donate', require("./routes/donation"));
// app.use('/payment', require("./routes/payment"));
app.use('/api/blogPost', require("./routes/blogPost"));
app.use('/api/conference', require("./routes/conference"));




// Start the server (Express + WebSocket)
server.listen(port, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on http://localhost:${port}`);
});

// Export the wss if still needed elsewhere
module.exports = { wss };

