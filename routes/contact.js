const express = require('express');
const router = express.Router();
const { sendCode, verifyEmail, saveContactInfo, saveInfoMailToAdim } = require('../helper/verififyController');
const Contact = require('../models/Contact');




// Contact Route
router.get('/', (req, res) => {
  res.json({ message: 'Contact route is working without auth' });
});

// Fetch all messages (GET)
router.get('/info', async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

//send verification Mail
router.post('/send-email/verification', sendCode);

// Verify Email Route
router.post('/verifyEmail', verifyEmail);

//contact request, info save to the DB and a confermation mail sent to who submit the request
router.post('/contactInfo', saveContactInfo);

//Quick contact request, info save to the DB and a confermation mail sent to who submit the request. 
//Also an email sent to Adnim from Requester for contact with all detail..

router.post('/quickContact', saveInfoMailToAdim);












module.exports = router;
