const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();
const mongoose = require('mongoose');
//responses
const Answer = require('../models/Response');
//questions
const Question = require('../models/Question');
const {User} = require('../models/User');



router.get('/', protect, (req, res) => {
  res.status(200).json("Server Start")
  //res.json({ message: `Welcome to the Servey, ${req.user.email}!` });
});



// Get 1 active questions at a time // used in survey page  Fetch questions for ongoing survey
router.get('/questions', async (req, res) => {
  const { page = 1, limit = 1 } = req.query; // Default to page 1, limit 1 (one question at a time)
  const skip = (page - 1) * limit;

  try {
    const questions = await Question.find({ isActive: true })
      .sort({ order: 1 }) // Ensure correct order
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Question.countDocuments({ isActive: true });

    res.status(200).json({
      data: questions,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching questions', error: err.message });
  }
});

// Get all active questions // used in Forum page
router.get('/questions/all', async (req, res) => {
  const { page = 1, limit = 50 } = req.query; // Default to page 1, limit 50 (50 question at a time)
  const skip = (page - 1) * limit;

  try {
    const questions = await Question.find({ isActive: true })
      .sort({ order: 1 }) // Ensure correct order
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Question.countDocuments({ isActive: true });

    res.status(200).json({
      data: questions,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching questions', error: err.message });
  }
});



// Route to get answer stats for each question
router.get('/questions/stats', async (req, res) => {
  try {
    const stats = await Answer.aggregate([
      {
        $group: {
          _id: '$questionId',
          yesCount: { $sum: { $cond: [{ $eq: ['$answer', 'Yes'] }, 1, 0] } },
          noCount: { $sum: { $cond: [{ $eq: ['$answer', 'No'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'questions', // Collection name for questions
          localField: '_id',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      {
        $project: {
          _id: 0,
          questionId: '$_id',
          questionText: '$question.text',
          yesCount: 1,
          noCount: 1,
        },
      },
    ]);

    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
});



// Submit answer // used in survey page  to post answer for ongoing survey
router.post('/answers', async (req, res) => {
  const { userId, questionId, answer } = req.body;

  // console.log('Received body:', req.body);

  if (!userId || !questionId || !answer) {
    return res.status(400).json({ message: 'Invalid request parameters' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      // console.log(`User not found for ID: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the question is already answered by this user
    if (user.completedQuestions.includes(questionId)) {
      return res.status(400).json({ message: 'You have already submitted an answer for this question.' });
    }

    // Add the question to the user's completedQuestions array
    user.completedQuestions.push(questionId);
    await user.save();

    // Save the answer in a separate collection (optional)
    const newAnswer = new Answer({
      userId,
      questionId,
      answer,
    });
    await newAnswer.save();

    return res.status(200).json({ message: 'Answer submitted successfully' });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});




// track servey progress of user by id // used in survey page  Fetch questions and progress concurrently
router.get('/user/progress', async (req, res) => {
  const { userId } = req.query;

 
  // console.log('Fetching progress for userId:', userId);

  if (!userId) {
    console.error('Missing userId');
    return res.status(400).json({ message: 'Missing userId' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error('Invalid userId:', userId);
    return res.status(400).json({ message: 'Invalid userId', providedId: userId });
  }

  try {
    const user = await User.findById(userId).populate('completedQuestions');
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return res.status(404).json({ message: 'User not found' });    }

   
    // console.log('Completed Questions:', user.completedQuestions);

    res.status(200).json(user.completedQuestions.map(q => q._id));
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Fetching answers accordding to question using userId //used in survey page 
router.get('/user/answers/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    // console.log('Fetching for get answers for userId:', userId);
    

    // Fetch user's profile
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch user's answers
    const answers = await Answer.find({ userId });

    // Fetch all questions
    const questionIds = answers.map((ans) => ans.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    console.log('Answers:', answers, 'Questions:', questions);
    

    // Combine answers with corresponding questions
    const response = answers.map((answer) => {
      const question = questions.find((q) => q._id.equals(answer.questionId));
      return {
        question: question?.text || 'Question not found',
        answer: answer.answer,
        questionId: question?._id,
      };
    });

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});





router.put('/answers/:id', async (req, res) => {
  const { id } = req.params;
  const { answer } = req.body;

  // Validate id
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid answer ID' });
  }

  try {
    const updatedAnswer = await Answer.findByIdAndUpdate(
      id,
      { answer, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedAnswer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    res.status(200).json(updatedAnswer);
  } catch (err) {
    res.status(500).json({ message: 'Error updating answer', error: err.message });
  }
});









// for detailed but limited Statistics
router.get('/api/stats/forum', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    

    // Correctly calculate the number of distinct survey participants
    const distinctParticipants = await Answer.distinct('userId');
    const surveyParticipants = distinctParticipants.length;

    const limit = parseInt(req.query.limit) || 1; // Default to 3 responses

    const responses = await Answer.aggregate([
      {
        $group: {
          _id: '$questionId',
          yesCount: { $sum: { $cond: [{ $eq: ['$answer', 'Yes'] }, 1, 0] } },
          noCount: { $sum: { $cond: [{ $eq: ['$answer', 'No'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'questions',
          localField: '_id',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      {
        $project: {
          questionText: '$question.text',
          yesCount: 1,
          noCount: 1,
        },
      },
      { $limit: limit }, // Add limit to control response size
    ]);

    res.status(200).json({ totalUsers, surveyParticipants, responses });
    console.log("total perticipint:", surveyParticipants);
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching forum stats', error });
  }
});

// for detailed stat
router.get('/api/stats/detailed', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    

    // Correctly calculate the number of distinct survey participants
    const distinctParticipants = await Answer.distinct('userId');
    const surveyParticipants = distinctParticipants.length;

    const responses = await Answer.aggregate([
      {
        $group: {
          _id: '$questionId',
          yesCount: { $sum: { $cond: [{ $eq: ['$answer', 'Yes'] }, 1, 0] } },
          noCount: { $sum: { $cond: [{ $eq: ['$answer', 'No'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'questions',
          localField: '_id',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      {
        $project: {
          questionText: '$question.text',
          yesCount: 1,
          noCount: 1,
        },
      },
    ]);

    res.status(200).json({ totalUsers, surveyParticipants, responses });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching detailed stats', error });
  }
});





module.exports = router;




