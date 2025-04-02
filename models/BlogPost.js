// // models/BlogPost.js

// server/models/BlogPost.js
const mongoose = require('mongoose');
const { isAfter, subMonths, format } = require('date-fns');

const blogPostSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String  },
    contentText: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, },
    comments: [
        {
          content: { type: String, required: true },
          author: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User',
            required: false // Not required for guests
          },
          authorName: { type: String, },
          guestName: { 
            type: String,
            default: "Guest" // Default name for anonymous users
          },
          isGuest: { 
            type: Boolean, 
            default: true // Default to guest unless authenticated user
          },
          createdAt: { type: Date, default: Date.now },
          post: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true }
        }
      ],
    imageUrl: { type: String, default: null }, // New field for file/image
    videoUrl: { type: String, default: null }, // New field for file/image
    likes: [{ type: String }], // Can be user ID or session ID for guests
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    category: { type: String,  },
    monthYear: { type: String }, // Format: "YYYY-MM"
    archivedAt: { type: Date }
}, { timestamps: true });

// Add virtual for checking if post should be archived
blogPostSchema.virtual('shouldArchive').get(function () {
    return isAfter(new Date(), subMonths(this.createdAt, 1));
});

// Pre-save hook to set monthYear
blogPostSchema.pre('save', function (next) {
    this.monthYear = format(this.createdAt, 'yyyy-MM');
    next();
});

// Static method to archive old posts
blogPostSchema.statics.archiveOldPosts = async function () {
    const oneMonthAgo = subMonths(new Date(), 1);
    await this.updateMany(
        {
            createdAt: { $lte: oneMonthAgo },
            status: 'active'
        },
        {
            status: 'archived',
            archivedAt: new Date()
        }
    );
};

// Static method to get posts by month
blogPostSchema.statics.getPostsByMonth = async function () {
    return this.aggregate([
        {
            $group: {
                _id: "$monthYear",
                count: { $sum: 1 },
                posts: { $push: "$$ROOT" }
            }
        },
        { $sort: { _id: -1 } }
    ]);
};

module.exports = mongoose.model('BlogPost', blogPostSchema);

