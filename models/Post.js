//PostSchema
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Tracks users who reposted
  shares: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Tracks users who shared  
  shareCount : { type: Number, default: 0 }, // Counts total share  
  repostCount: { type: Number, default: 0 }, // Counts total reposts  
  originalCreator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Optional field for reposts
  originalPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Tracks users who bookmarked the post
  bookmarkCount: { type: Number, default: 0 }, // Total bookmark count
  reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reportCount: { type: Number, default: 0 },
  isReported: { type: Boolean, default: false },

  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      text: { type: String, required: true },
      likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // New field for likes
      reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      reportCount: { type: Number, default: 0 },
      isReported: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  imageUrl: { type: String, default: null }, // New field for file/image
  videoUrl: { type: String, default: null }, // New field for file/image
  createdAt: { type: Date, default: Date.now },
});




module.exports = mongoose.model('Post', PostSchema);
