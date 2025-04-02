const express = require('express');
const router = express.Router();
const { sendCode, verifyEmail, saveContactInfo, saveInfoMailToAdim } = require('../helper/verififyController');



// Contact Route
router.get('/', (req, res) => {
  res.json({ message: 'Contact route is working without auth' });
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
