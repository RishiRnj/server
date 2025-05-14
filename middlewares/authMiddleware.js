const jwt = require('jsonwebtoken');
const {User} = require('../models/User'); // Ensure the User model is correct
const uuidv4 = require('uuid').v4;


const protect = async (req, res, next) => {
  console.log('Authorization header:', req.headers.authorization);

  // Check for Authorization header
  if (!req.headers.authorization) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  try {
    // Extract and verify the token
    const token = req.headers.authorization.split(' ')[1];
    console.log('Extracted token:', token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // Fetch user and attach to request
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }

    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// middleware/authMiddleware.js
// const authenticateAdmin = (req, res, next) => {
//   if (req.user && req.user.role === "admin") {
//     next();
//   } else {
//     res.status(403).json({ message: "Access denied. Admins only." });
//   }
// };

//worked on 2023-10-03
// const protectBlogPost = async (req, res, next) => {
//   console.log('Authorization header:', req.headers.authorization);

//   if (req.headers.authorization) {
//     try {
//       const token = req.headers.authorization.split(' ')[1];
//       console.log('Extracted token:', token);

//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       console.log('Decoded token:', decoded);

//       req.user = await User.findById(decoded.id).select('-password');
//       if (!req.user) {
//         return res.status(404).json({ message: 'User not found' });
//       }
//     } catch (error) {
//       console.error('JWT verification error:', error.message);
//       return res.status(403).json({ message: 'Invalid or expired token' });
//     }
//   } 

//   if (!req.user) { 
//     if (!req.cookies || !req.cookies.guestId) {  // ✅ Ensure `req.cookies` is defined
//       const guestId = uuidv4();
//       res.cookie('guestId', guestId, {
//         httpOnly: true, 
//         secure: process.env.NODE_ENV === 'production', 
//         sameSite: 'Strict', 
//         maxAge: 30 * 24 * 60 * 60 * 1000, 
//       });
//       req.user = { _id: guestId, isGuest: true };
//     } else {
//       req.user = { _id: req.cookies.guestId, isGuest: true };
//     }
//   }

//   next();
// };


const protectBlogPost = async (req, res, next) => {
  // Try JWT authentication first
  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Mark as authenticated user
      req.user.isGuest = false;
      return next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      // Continue to guest check if token is invalid
    }
  }

  // Guest handling
  if (!req.cookies?.guestId) {
    const guestId = uuidv4();
    res.cookie('guestId', guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    req.user = { _id: guestId, isGuest: true };
  } else {
    req.user = { _id: req.cookies.guestId, isGuest: true };
  }

  next();
};




const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Authentication token missing" });
  }

  try {
    // Verify the token and extract the payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user data to the request object
    req.user = decoded; // decoded contains user details like id, role, etc.

    // Optional: Fetch full user data from DB if required
    // const user = await User.findById(decoded.id);
    // if (!user) {
    //   return res.status(404).json({ message: "User not found" });
    // }
    // req.user = user;

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    next(); // Proceed to the next middleware/controller
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token", error });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (err) {
      // Invalid token: treat as guest
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};







module.exports = { protect, authenticateAdmin, protectBlogPost, optionalAuth };


