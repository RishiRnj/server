// //passport.js

const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const bcrypt = require('bcryptjs');
const {User} = require('../models/User');

// Local Strategy
passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return done(null, false, { message: 'No user with this email' });
      }

      // Check if the user signed up with Google
      if (user.authProvider === 'google') {
        return done(null, false, {
          message: 'This email is linked to Google login. Please log in using Google.',
          googleLoginRequired: true,
          email: user.email,
        });
      }

      // Check if the user has verified their email
      if (!user.isVerified) {
        return done(null, false, {
          message: 'Email verification pending.',
          success: false,
          verificationRequired: true,
          email: user.email,
        });
      }

      // Match the password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

//Google Strategy
// Google login callback, checking if email exists in DB
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL_BE}/auth/google/callback`,
      scope: ["profile", "email"], // Ensure proper scope
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('Google account does not provide an email address'), null);
        }

        // Check if user exists in DB
        let user = await User.findOne({ email });

        if (user) {
          return done(null, user);
        }

        // Create a new user if not found
        user = await User.create({
          googleId: profile.id,
          displayName: profile.displayName,
          email: profile.emails[0].value,
          image: profile.photos[0]?.value || null,
          authProvider: 'google',
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);


// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
