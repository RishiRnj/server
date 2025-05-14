const { check } = require('express-validator');

exports.validateCampaignerProfile = [
  check('username', 'Campaigner name is required').not().isEmpty(),
  check('Mission', 'Mission statement is required').not().isEmpty(),
  check('campaignFor', 'Campaign category is required').not().isEmpty(),
  check('campaignDuration', 'Duration is required').isInt({ min: 1 }),
  check('campaignAmount', 'Amount must be greater than 0').isInt({ min: 1 }),
  check('agreedCampaignerTerms', 'You must agree to the terms').isBoolean().equals('true'),
  
  // Conditional validation for organization fields
  check('orgName').if(check('campaignUseFor').equals('organization'))
    .not().isEmpty().withMessage('Organization name is required'),
  check('orgAddress').if(check('campaignUseFor').equals('organization'))
    .not().isEmpty().withMessage('Organization address is required'),
  check('orgCity').if(check('campaignUseFor').equals('organization'))
    .not().isEmpty().withMessage('Organization city is required'),
];