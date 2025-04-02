require('dotenv').config({path: '.env'});
const mongoose = require('mongoose');
const Question = require('../models/Question');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Database connected');
    seedQuestions();
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1); // Exit with failure
  });

  const seedQuestions = async () => {
    const questions = [
      { text: 'Do you agree with the statement "Unity is strength"?', order: 1, isActive: true },
      { text: 'Have you participated in any community activities this month?', order: 2, isActive: true },
      { text: 'Would you recommend this platform to others?', order: 3, isActive: true },
      { text: 'Do you feel the platform supports your goals?', order: 4, isActive: true },
      

    ];
  
    try {
      // Clear the collection before seeding
      await Question.deleteMany({});
      await Question.insertMany(questions);
      console.log('Questions seeded successfully');
    } catch (error) {
      console.error('Error seeding questions:', error);
    } finally {
      mongoose.connection.close();
    }
  };
  