const express = require('express');
const { protect, authenticateAdmin, protectBlogPost, optionalAuth } = require('../middlewares/authMiddleware');
const router = express.Router();
const { User } = require('../models/User');
const Survey = require('../models/Survey');

const multer = require("multer");
const sharp = require("sharp");
const Handbrake = require('handbrake-js');

const cloudinary = require("cloudinary").v2;
exports.cloudinary = cloudinary;
const fs = require("fs");
const path = require('path');
const {
  notifyAdminAboutNewCampaigner, notificationCampaignerDeleteSurvey,
  createAdminNotification, createRenewNotification, notifyCampaignerStatusChange
} = require('../helper/notification');



// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup
// Configure Multer to use disk storage

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {

    // Use userId from the request object
    const user_id = req.user?.id;
    if (!user_id) {
      return cb(new Error("User ID not found in request"));
    }

    // Generate filename using user_id and original file name
    const filename = `${user_id}-${Date.now()}-${file.originalname}`;
    cb(null, filename);


    // const uniqueSuffix = `${Date.now()}-${file.originalname}`;
    // cb(null, uniqueSuffix);
  },

});

const upload = multer({ storage });

// Helper function to compress and upload an image
async function processImage(file) {
  const filePath = file.path;

  try {
    // Read the file as a buffer to avoid file locks
    const buffer = await fs.promises.readFile(filePath);

    // Process the image using sharp from buffer (not file path)
    const optimizedBuffer = await sharp(buffer)
      .webp({ quality: 40 }) // Compress image
      .toBuffer();

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "Campaigner-Uploads-img",
          format: "webp",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(optimizedBuffer); // Send processed buffer to Cloudinary
    });

    return result.secure_url; // Return Cloudinary image URL
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  } finally {
    // Ensure file is deleted after processing
    try {
      await fs.promises.unlink(filePath);
      console.log("Temporary file deleted:", filePath);
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  }
}


// Helper function to compress and upload an Video
async function processVideo(file) {

    const inputPath = file.path;
    const outputPath = path.join(__dirname, `../uploads/processed-${Date.now()}.mp4`);
    // console.log("hit Video out", outputPath);
    // console.log("hit Video in", inputPath);

    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    try {
        // HandBrake options
        const options = {
            input: inputPath,
            output: outputPath,
            preset: 'Very Fast 480p30',
        };

        console.time('Video Processing');
        await new Promise((resolve, reject) => {
            Handbrake.spawn(options)
                .on('progress', progress => console.log(`Progress: ${progress.percentComplete}%`))
                .on('error', reject)
                .on('end', resolve);
        });
        console.timeEnd('Video Processing');

        console.time('Cloudinary Upload');
        const result = await cloudinary.uploader.upload(outputPath, { resource_type: 'video', folder: 'Campaigner-Uploads_vid' }); // Specify the folder where the file will be stored
        
        console.timeEnd('Cloudinary Upload');

        return result.secure_url;
    } catch (err) {
        console.error('Error processing video:', err);
        throw err;
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
}






// router.get('/', protect, (req, res) => {
//   res.json({ message: `Welcome to the forum, ${req.user.email}!` });
// });
router.get('/', (req, res) => {
  res.json({ message: `Welcome to the forum!` });
});



// Create Survey (with Trial Option):
// router.post('/create-survey', protect, upload.single('paymentSlip'), async (req, res) => {
//   try {
//     const { title, description, questions, durationDays, budget, isTrial } = req.body;
//     console.log('Request body:', req.body);
//     console.log('File:', req.file);

//     const userId = req.user._id;

//     const user = await User.findById(userId);
//     if (!user.isCampaigner && user.role !== 'admin') {
//       return res.status(403).json({ message: 'Only campaigners can create surveys' });
//     }

//     // Check if trying to use trial when already used
//     if (isTrial && user.isTrialUsed) {
//       return res.status(400).json({ message: 'Trial already used' });
//     }

//     // // Calculate end date
//     // const startDate = new Date();
//     // const endDate = new Date();
//     // endDate.setDate(startDate.getDate() + Number(durationDays));

//     // Calculate end date
//     const startDate = new Date();
//     const endDate = new Date();

//     const duration = Number(durationDays);
//     if (user.role !== 'admin' && isNaN(duration)) {
//       return res.status(400).json({ message: 'Invalid or missing durationDays' });
//     }
//     endDate.setDate(startDate.getDate() + (isNaN(duration) ? 0 : duration));


//     // Parse JSON string from FormData
//     let parsedQuestions;
//     try {
//       parsedQuestions = JSON.parse(questions);
//     } catch (parseErr) {
//       return res.status(400).json({ message: 'Invalid questions format' });
//     }


//     const survey = new Survey({
//       title,
//       description,
//       createdBy: userId,
//       orgName: user?.orgName || 'Admin Survey',
//       budget: user.role !== 'admin' ? Number(budget) : '',
//       durationDays: user.role !== 'admin' ? Number(durationDays) : '',
//       startDate,
//       endDate,
//       isTrial: isTrial === 'true',
//       isAdminCreated: user.role === 'admin' ? true : false,
//       status: user.role === 'admin' ? 'active' : 'draft',
//       questions: parsedQuestions
//     });

//     await survey.save();

//     // Handle payment slip if uploaded
//     if (req.file) {
//       const processedSlip = await processImage(req.file); // Assume this returns a URL or buffer
//       user.paymentSlip = processedSlip;
//     }

//     // Mark trial as used
//     if (isTrial === 'true') {
//       user.isTrialUsed = true;
//     }

//     await user.save();

//     res.status(201).json(survey);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });



router.post('/create-survey', protect, upload.any(), async (req, res) => {
  try {
    const { title, description, questions, durationDays, budget, isTrial } = req.body;
    // console.log('Request body:', req.body);
    // console.log('Files:', req.files);

    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user.isCampaigner && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only campaigners can create surveys' });
    }

    // Check if trying to use trial when already used
    if (isTrial === 'true' && user.isTrialUsed) {
      return res.status(400).json({ message: 'Trial already used' });
    }

    // Parse questions
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(questions);
    } catch (parseErr) {
      return res.status(400).json({ message: 'Invalid questions format' });
    }

    // Process question attachments
    const questionAttachments = {};
    req.files.forEach(file => {
      if (file.fieldname.startsWith('question_') && file.fieldname.endsWith('_attachment')) {
        const qIndex = file.fieldname.match(/question_(\d+)_attachment/)[1];
        questionAttachments[qIndex] = file;
      }
    });

    // Process each question with potential attachment
    const processedQuestions = await Promise.all(parsedQuestions.map(async (q, qIndex) => {
      const attachmentFile = questionAttachments[qIndex];
      const question = {
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options
      };

      if (attachmentFile) {
        const attachmentType = req.body[`question_${qIndex}_attachmentType`];
        if (attachmentType === 'image') {
          question.attachment = await processImage(attachmentFile);
        } else if (attachmentType === 'video') {
          question.attachment = await processVideo(attachmentFile);
        }
      }

      return question;
    }));

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    const duration = Number(durationDays);
    endDate.setDate(startDate.getDate() + (isNaN(duration) ? 0 : duration));

    // Create survey
    const survey = new Survey({
      title,
      description,
      createdBy: userId,
      orgName: user?.orgName || 'Admin Survey',
      budget: user.role !== 'admin' ? Number(budget) : 0,
      durationDays: user.role !== 'admin' ? Number(durationDays) : 0,
      startDate,
      endDate,
      isTrial: isTrial === 'true',
      isAdminCreated: user.role === 'admin',
      status: user.role === 'admin' ? 'active' : 'draft',
      questions: processedQuestions
    });

    await survey.save();

    // Handle payment slip if uploaded
    const paymentSlipFile = req.files.find(f => f.fieldname === 'paymentSlip');
    if (paymentSlipFile) {
      user.paymentSlip = await processImage(paymentSlipFile);
    }

    // Mark trial as used if applicable
    if (isTrial === 'true') {
      user.isTrialUsed = true;
    }

    await user.save();

    res.status(201).json(survey);
  } catch (err) {
    console.error('Survey creation error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// EDIT SURVEY:
// router.put('/:id', protect, async (req, res) => {
//   try {
//     const survey = await Survey.findById(req.params.id);

//     if (!survey) {
//       return res.status(404).json({ message: 'Survey not found' });
//     }

//     // Check ownership
//     if (survey.createdBy.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Not authorized to edit this survey' });
//     }

//     // Prevent editing certain fields if published
//     if (survey.status !== 'draft') {
//       const allowedUpdates = ['questions', 'description'];
//       Object.keys(req.body).forEach(key => {
//         if (!allowedUpdates.includes(key)) {
//           delete req.body[key];
//         }
//       });
//     }

//     // Update survey
//     Object.assign(survey, req.body);
//     await survey.save();

//     res.status(200).json(survey);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });

// EDIT SURVEY with attachments:
router.put('/:id', protect, upload.any(), async (req, res) => {
  try {
    const surveyData = JSON.parse(req.body.survey);
    const files = req.files || [];
    
    // Get current survey
    const currentSurvey = await Survey.findById(req.params.id);
    if (!currentSurvey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Process attachments
    const questionAttachments = {};
    files.forEach(file => {
      const match = file.fieldname.match(/question_(\d+)_attachment/);
      if (match) questionAttachments[match[1]] = file;
    });

    // Update questions with proper attachment handling
    const updatedQuestions = await Promise.all(
      surveyData.questions.map(async (q, qIndex) => {
        const currentQuestion = currentSurvey.questions[qIndex] || {};
        
        // Handle attachment changes
        if (q.removeAttachment) {
          // Explicit removal
          q.attachment = null;
        } else if (questionAttachments[qIndex]) {
          // New attachment
          const file = questionAttachments[qIndex];
          q.attachment = file.mimetype.startsWith('image') 
            ? await processImage(file) 
            : await processVideo(file);
        } else if (currentQuestion.attachment && !q.hasNewAttachment) {
          // Preserve existing attachment
          q.attachment = currentQuestion.attachment;
        }
        
        return q;
      })
    );

    // Update survey
    const updatedSurvey = await Survey.findByIdAndUpdate(
      req.params.id,
      { 
        ...surveyData,
        questions: updatedQuestions,
        status: surveyData.status || currentSurvey.status,
        startDate: surveyData.startDate || currentSurvey.startDate,
        endDate: surveyData.endDate || currentSurvey.endDate
      },
      { new: true }
    );

    res.json(updatedSurvey);
  } catch (err) {
    console.error('Survey update error:', err);
    res.status(500).json({ 
      message: 'Failed to update survey',
      error: err.message 
    });
  }
});




// toogle status survey for admin
router.put('/toogle-status/:id', authenticateAdmin, async (req, res) => {
  try {
    const { budget, durationDays } = req.body;
    const survey = await Survey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    const now = new Date();

    if (survey.status === 'active') {
      survey.status = 'completed';
    } else {
      survey.status = 'active';
      survey.newStartDate = now;
      survey.endDate = new Date(now.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);
      survey.budget = Number(budget);
      survey.durationDays = Number(durationDays);
    }

    await survey.save();

    const updatedData = await survey.populate('createdBy', 'updateFullName email mobile');

    // send notification to campaigner
    await notifyCampaignerStatusChange(survey);

    res.status(200).json(updatedData);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// POST survey response final veersion
router.post('/:id/respond', optionalAuth, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);

    if (!survey || survey.status !== 'active') {
      return res.status(400).json({ message: 'Survey not found or not active' });
    }

    const { anonymousId, answers } = req.body;
    const userId = req.user?._id;

    // Prevent duplicate responses
    const hasResponded = survey.responses.some(r => {
      if (userId && r.respondent) {
        return r.respondent.toString() === userId.toString();
      }
      if (!userId && anonymousId && r.anonymousId) {
        return r.anonymousId === anonymousId;
      }
      return false;
    });

    if (hasResponded) {
      return res.status(400).json({ message: 'You have already responded' });
    }

    // Normalize answer structure
    const flattenAnswers = input => {
      if (Array.isArray(input) && typeof input[0] === 'object') {
        return input[0];
      }
      return input;
    };

    const normalizedAnswers = flattenAnswers(answers);

    // Validate answer structure
    if (!normalizedAnswers || typeof normalizedAnswers !== 'object' || Array.isArray(normalizedAnswers)) {
      return res.status(400).json({ message: 'Invalid answers format. Expected a flat object of questionId: answer.' });
    }

    // Determine respondent name
    let respondentName = 'Guest User';
    if (userId) {
      // Get the most available name from user object
      respondentName = req.user.updateFullName ||
        req.user.username ||
        req.user.displayName ||
        req.user.mobile ||
        'Registered User';
    }

    // Save the response
    const newResponse = {
      answers: normalizedAnswers,
      respondedAt: new Date(),
      ...(userId ? {
        respondent: userId,
        respondentName
      } : {
        anonymousId,
        respondentName
      }
      ),
      isAnonymous: !userId
    };

    survey.responses.push(newResponse);
    await survey.save();

    // Return response ID for frontend tracking
    const savedResponse = survey.responses[survey.responses.length - 1];
    res.status(201).json({
      message: 'Response recorded successfully',
      responseId: savedResponse._id,
      respondentName: savedResponse.respondentName
    });

  } catch (err) {
    console.error('[Survey Respond Error]', err);
    res.status(500).json({
      message: 'Server error while saving response',
      error: err.message
    });
  }
});




// DELETE Survey
router.delete('/:id', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    if (survey.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this survey' });
    }

    // Load user
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prepare and push survey summary
    user.surveyData.push({
      title: survey.title,
      orgName: survey.orgName,
      noOfQ: survey.questions.length,
      totalRespondent: survey.responses?.length || 0,
      startDate: survey.startDate,
      endDate: survey.endDate
    });

    await user.save();

    // Send notification
    await notificationCampaignerDeleteSurvey(survey, user);

    // Delete survey
    await survey.deleteOne();

    res.status(200).json({ message: 'Survey deleted and data archived successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});









// publish survey from draft to active for campaigner
router.patch('/publish_Campaign/:id', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Check if user owns the survey
    if (survey.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    survey.status = 'active';
    survey.startDate = new Date();
    survey.endDate = new Date(Date.now() + survey.durationDays * 24 * 60 * 60 * 1000);

    await survey.save();

    const user = await User.findById(survey.createdBy.toString());
    if (user) {
      user.isTrialUsed = false; // Mark trial as used
      user.isPaymentDone = false;
      user.campaignPaymentStatus = "pending"
      user.paymentSlip = null; // Clear payment slip after publishing
      user.campaignAmount = 0;
      user.campaignDuration = 0;
      await user.save();
    }



    res.status(200).json(survey);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// renew request for survey by campaigner
router.post('/renew-request/:id', protect, async (req, res) => {
  try {
    const { budget, days } = req.body;
    const survey = await Survey.findById(req.params.id).populate('createdBy', 'email updateFullName mobile');

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    await createRenewNotification(survey, budget, days, req.user._id);

    res.status(200).json({ message: 'Request submitted. Admin will review and respond.' });
  } catch (err) {
    console.error('Renew request error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});












// GET surveys for admin
router.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const now = new Date();

    // Only get campaigner-created (not admin-created) active, expired surveys
    const surveys = await Survey.find({
      status: 'active',
      endDate: { $lt: now },
      isAdminCreated: false
    });

    // Mark them as completed
    const updates = surveys.map(async (survey) => {
      survey.status = 'completed';
      await survey.save();
    });

    await Promise.all(updates);

    // Return all surveys (admin and campaigner)
    const updatedSurveys = await Survey.find({})
      .sort({ createdAt: -1 })
      .populate('createdBy', 'updateFullName email mobile');

    res.status(200).json(updatedSurveys);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// GET surveys for created by user isCampaigner
router.get('/my-surveys', protect, async (req, res) => {
  try {
    const surveys = await Survey.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'updateFullName email mobile');

    res.status(200).json(surveys);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});




// GET public survey which created by admin
router.get('/adminCreated', async (req, res) => {
  try {
    const survey = await Survey.findOne({

      isAdminCreated: true,
      status: { $in: ['active', 'completed'] }
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found or not active' });
    }

    res.status(200).json(survey);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});






// backend routes for get  notification for pending survey for user
router.get('/pending', optionalAuth, async (req, res) => {
  try {
    const activeSurveys = await Survey.find({ 
      status: 'active', 
      isAdminCreated: true 
    }).lean();
    
    if (req.user) {
      const pendingSurveys = activeSurveys.filter(survey => {
        return !survey.responses.some(response => {
          // Proper ID comparison
          return response.respondent?.toString() === req.user._id.toString();
        });
      });
      return res.json(pendingSurveys);
    } else {
      res.json(activeSurveys);
    }
  } catch (err) {
    console.error('Error fetching pending surveys:', err);
    res.status(500).json({ message: 'Error fetching pending surveys' });
  }
});







// GET public survey which created by campaigner
router.get('/by-user/:id', async (req, res) => {
  try {
    


    const surveys = await Survey.findOne({

      isAdminCreated: false,
      _id: req.params.id,
      status: { $in: ['active', 'completed'] }
    });




    res.status(200).json(surveys);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// GET public survey
router.get('/public/:id', async (req, res) => {
  try {
    const survey = await Survey.findOne({
      _id: req.params.id,
      status: { $in: ['active', 'completed'] }
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found or not active' });
    }

    res.status(200).json(survey);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});




//for preview survey
router.get('/:id', async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id)
      .populate('createdBy', 'updateFullName email');

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    res.status(200).json(survey);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});






//Dynamic Survey Display Page:
router.get('/active-surveys', authenticateAdmin, async (req, res) => {
  try {
    const activeSurveys = await Survey.find({}).sort({ createdAt: -1 })
      .populate('createdBy', 'email orgName');

    res.status(200).json(activeSurveys);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});




// GET survey results - Final improved version
router.get('/:id/results', protect, async (req, res) => {
  try {
    

    // Fetch survey with minimal population
    const survey = await Survey.findById(req.params.id)
      .populate('createdBy', 'updateFullName email')
      .lean();

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Authorization check
    // Authorization check
    const isAdmin = req.user.role === 'admin';
    const isOwner = survey.createdBy?._id.toString() === req.user._id.toString();


    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to view these results' });
    }


    // Initialize arrays if missing
    survey.questions = survey.questions || [];
    survey.responses = survey.responses || [];

    // Handle question-specific request
    if (req.query.question) {
      const questionId = req.query.question;
      const question = survey.questions.find(q => q._id.toString() === questionId);

      if (!question) {
        return res.status(404).json({ message: 'Question not found in this survey' });
      }

      // Calculate response count for this specific question
      const questionResponseCount = survey.responses.filter(r =>
        r.answers && r.answers[questionId] !== undefined
      ).length;

      return res.status(200).json({
        surveyTitle: survey.title,
        surveyId: survey._id,
        question: {
          ...question,
          responseCount: questionResponseCount
        },
        responses: survey.responses
          .filter(r => r.answers && r.answers[questionId] !== undefined)
          .map(r => ({
            _id: r._id,
            respondent: r.respondent || r.anonymousId || 'Anonymous',
            answer: r.answers[questionId],
            respondedAt: r.respondedAt
          })),
        totalResponses: questionResponseCount
      });
    }

    // Full survey results
    const processedSurvey = {
      ...survey,
      questions: survey.questions.map(q => ({
        ...q,
        responseCount: survey.responses.filter(r =>
          r.answers && r.answers[q._id] !== undefined
        ).length
      })),
      totalResponses: survey.responses.length
    };

    res.status(200).json(processedSurvey);
  } catch (err) {
    console.error('Error fetching survey results:', err);
    res.status(500).json({
      message: 'Server error while processing results',
      error: err.message
    });
  }
});


// // Export survey results to CSV
router.get('/:id/export', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id)
      .populate('responses.respondent', 'respondentName email');

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Authorization check
    const isOwner = survey.createdBy.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Prepare main response headers
    const headers = [
      'Response ID',
      'Respondent',
      ...survey.questions.map((q, i) => `Q${i + 1}: ${q.questionText}`),
      'Response Date'
    ];

    // Prepare main response rows
    const rows = survey.responses.map(response => {
      const respondent = response.respondent?.respondentName || response.respondent?.email ||
        (response.anonymousId ? `Anonymous (${response.anonymousId})` : 'Unknown');

      return [
        response._id,
        respondent,
        ...survey.questions.map(q => {
          const answer = response.answers[q._id];
          if (Array.isArray(answer)) {
            return answer.filter(a => a).join('; ');
          }
          return answer || '';
        }),
        new Date(response.respondedAt).toISOString()
      ];
    });

    // Prepare chart data summary
    const chartHeaders = ['Question', 'Response', 'Count'];


    const chartData = [];

    survey.questions.forEach((q, index) => {
      const counts = {};
      const questionText = `Q${index + 1}: ${q.questionText}`;

      // Count all answers
      survey.responses.forEach(response => {
        const answer = response.answers[q._id];

        if (Array.isArray(answer)) {
          answer.forEach(a => {
            if (a) counts[a] = (counts[a] || 0) + 1;
          });
        } else if (answer) {
          counts[answer] = (counts[answer] || 0) + 1;
        }
      });

      // Include all expected options from question
      const expectedResponses = Array.isArray(q.options) ? q.options : [];

      expectedResponses.forEach((option, idx) => {
        chartData.push([
          idx === 0 ? questionText : '',  // Show question text only on first row
          option,
          counts[option] || 0             // If not answered, count is 0
        ]);
      });
    });



    // Convert all to CSV format
    const escapeCsvField = (field) => `"${String(field).replace(/"/g, '""')}"`;

    const csvContent = [
      // Main response section
      headers.map(escapeCsvField).join(','),
      ...rows.map(row => row.map(escapeCsvField).join(',')),

      '', '', // Empty lines before chart section

      // Chart data section
      'Chart Data',
      chartHeaders.map(escapeCsvField).join(','),
      ...chartData.map(row => row.map(escapeCsvField).join(','))
    ].join('\n');

    // Send CSV as download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition',
      `attachment; filename=survey_${survey._id}_results_${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});





// GET export question results as CSV
router.get('/:id/questions/:questionId/export', protect, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id).lean();

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    // Authorization check
    const isAdmin = req.user.role === 'admin';
    const isOwner = survey.createdBy.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Find the specific question
    const question = survey.questions.find(
      q => q._id.toString() === req.params.questionId
    );

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Prepare CSV data
    const headers = ['Respondent', 'Answer', 'Date' , `${question.questionText}`];
    // Prepare rows based on responses
    const rows = survey.responses
      .filter(r => r.answers && r.answers[question._id] !== undefined)
      .map(r => {
        const answer = r.answers[question._id];
        return [
          r.respondentName || r.anonymousId || 'Anonymous',
          Array.isArray(answer) ? answer.join('; ') : answer,
          new Date(r.respondedAt).toISOString()
        ];
      });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field =>
        `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Set headers and send file
    const filenameSafe = question.questionText.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition',
      `attachment; filename=question_${filenameSafe}_results.csv`);
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({
      message: 'Failed to export question results',
      error: err.message
    });
  }
});











module.exports = router;
