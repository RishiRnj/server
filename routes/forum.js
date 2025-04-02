const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();

// router.get('/', protect, (req, res) => {
//   res.json({ message: `Welcome to the forum, ${req.user.email}!` });
// });
router.get('/',  (req, res) => {
  res.json({ message: `Welcome to the forum!` });
});


  

module.exports = router;
