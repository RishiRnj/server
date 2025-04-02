const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { User } = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const stream = require('stream'); // Add this import for stream 
const { log } = require('console');
const { broadcast } = require('../utils/websocketUtils');
const fs = require('fs');
const path = require('path');
const Handbrake = require('handbrake-js');
const sharp = require('sharp');




// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});



// Multer setup for handling the file upload
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
        const uniqueSuffix = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueSuffix);
    },
    
});

const upload = multer({ storage });

// Helper function to compress and upload an image
async function processImage(file) {

    const filePath = file.path; // Define the file path at the beginning of the function
    // const optimizedBuffer = await sharp(file.path)
    //     .resize(768, 576, { fit: 'cover' })
    //     .jpeg({ quality: 80 }) // Adjust quality as needed
    //     .toBuffer();
    const optimizedBuffer = await sharp(file.path)    
    .resize(768, 576, { fit: 'cover' })
    .webp({ quality: 70 })
    .toBuffer({ resolveWithObject: true })
    .then(({ data }) => sharp(data).withMetadata({ orientation: 1 }).toBuffer());


    try {

        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: 'User-Uploads-img',
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(optimizedBuffer);
        });

        return result.secure_url;
    } catch (error) {
        console.error('Error uploading image to Cloudinary:', error);
        throw error;
    } finally {
        // Ensure the file is deleted from the local upload folder
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Delete the file
            console.log('Temporary file deleted:', filePath);
        }
    }
}


// Helper function to compress and upload an Video
async function processVideo(file) {

    const inputPath = file.path;
    const outputPath = path.join(__dirname, `../uploads/processed-${Date.now()}.mp4`);
    console.log("hit Video out", outputPath);
    console.log("hit Video in", inputPath);

    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    try {
        // HandBrake options
        const options = {
            input: inputPath,
            output: outputPath,
            preset: 'Very Fast 1080p30',
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
        const result = await cloudinary.uploader.upload(outputPath, { resource_type: 'video', folder: 'user_uploads_vid' }); // Specify the folder where the file will be stored
        
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


// Create a new post with Image and video
router.post('/', protect, upload.single('userUpload'), async (req, res) => {
    try {
        console.log("req file", req.file);
        const { content } = req.body;
        let imageUrl = null;
        let videoUrl = null;

        // Check if the file is an image or video
        if (req.file) {
            if (req.file.mimetype.startsWith('image/')) {
                imageUrl = await processImage(req.file);
            } else if (req.file.mimetype.startsWith('video/')) {
                videoUrl = await processVideo(req.file);
            }
        }

        // Create the new post
        const newPost = new Post({
            user: req.user.id,
            content,
            imageUrl,
            videoUrl,
        });

        await newPost.save();
        await newPost.populate('user', 'displayName username updateFullName userImage followers');

        // Broadcast the new post to the author's followers
        const userId = newPost.user._id.toString();
        const followers = newPost.user.followers.map((follower) => follower.toString());

        const newPostData = {
            ...newPost.toObject(),
            followerCount: followers.length,
        };

        const recipients = [...new Set([...followers, userId])];

        // Broadcast to followers and author
        followers.forEach((followerId) => {
            broadcast(req.wss, { ...newPostData, isFollowed: true }, 'newPost', [followerId]);
        });

        broadcast(req.wss, { ...newPostData, isFollowed: false }, 'newPost', [userId]);

        res.status(201).json(newPostData);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Error creating post', error: error.message });
    }
});


// // Create a new post with only Img
// router.post('/', protect, upload.single('userUpload'), async (req, res) => {
//     try {
//         const { content } = req.body;

//         // Optional image processing
//         let imageUrl = null;
//         if (req.file) {
//             const bufferStream = new stream.PassThrough();
//             bufferStream.end(req.file.buffer);

//             const cloudinaryResult = await new Promise((resolve, reject) => {
//                 const uploadStream = cloudinary.uploader.upload_stream(
//                     {
//                         folder: 'profile-images',
//                         allowed_formats: ['jpeg', 'png', 'jpg', 'gif'],
//                         transformation: [
//                             { width: 768, height: 576, crop: 'fill' },
//                             { quality: 'auto' },
//                         ],
//                     },
//                     (error, result) => {
//                         if (error) return reject(error);
//                         resolve(result);
//                     }
//                 );
//                 bufferStream.pipe(uploadStream);
//             });

//             imageUrl = cloudinaryResult.secure_url;
//         }

//         // Create a new post
//         const newPost = new Post({
//             user: req.user.id,
//             content,
//             imageUrl,
//         });

//         await newPost.save();

//         await newPost.populate('user', 'displayName username updateFullName userImage followers');

//         // Get followers of the user
//         const userId = newPost.user._id.toString();
//         const followers = newPost.user.followers.map((follower) => follower.toString());
//         const followerCount = followers.length; // Get the count of followers

//         // Include `followerCount` in the new post data
//         const newPostData = {
//             ...newPost.toObject(),
//             followerCount,
//         };

//         const recipients = [...new Set([...followers, userId])]; // Include author and followers

//         // Broadcast new post to the followers timeline
//         followers.forEach((followerId) => {
//             // For followers, include `isFollowed: true`
//             const followerPostData = {
//                 ...newPostData,
//                 user: {
//                     ...newPost.user.toObject(),
//                     isFollowed: true,
//                 },
//             };
//             // Broadcast only to this specific follower
//             broadcast(req.wss, followerPostData, 'newPost', [followerId]);
//         });

//         // Broadcast new post to the user's timeline 
//         const authorPostData = {
//             ...newPostData,
//             user: {
//                 ...newPost.user.toObject(),
//                 isFollowed: false, // The author doesn't follow themselves
//             },
//         };

//         // Broadcast the post data to the author
//         broadcast(req.wss, authorPostData, 'newPost', [userId]);
//         // Broadcast new post to the user's timeline and followers
//         // broadcast(req.wss, newPostData, 'newPost', recipients);

//         res.status(201).json(newPostData);
//         console.log("New post broadcasted:", newPostData);

//     } catch (error) {
//         res.status(500).json({ message: 'Error creating post', error: error.message });
//     }
// });






// Repost a post with video or Img route
router.post('/:postId/repost', protect, async (req, res) => {
    try {
        const repostedPost = await Post.findById(req.params.postId);
        if (!repostedPost) return res.status(404).json({ message: 'Post not found' });

        // Determine the true original post and creator
        const originalPostId = repostedPost.originalPost || repostedPost._id;
        const originalCreator = repostedPost.originalCreator || repostedPost.user;

        // Create a new repost for the current user
        const repost = new Post({
            content: repostedPost.content,
            imageUrl: repostedPost.imageUrl,
            videoUrl: repostedPost.videoUrl,
            originalCreator: originalCreator,
            originalPost: originalPostId,
            user: req.user._id,
        });

        await repost.save();

        // Increment repost count for reposted post
        repostedPost.repostCount = (repostedPost.repostCount || 0) + 1;
        await repostedPost.save();

        // Increment repost count for the original post if different from repostedPost
        let originalPostCount = 0;
        if (originalPostId.toString() !== repostedPost._id.toString()) {
            const originalPost = await Post.findById(originalPostId);
            if (originalPost) {
                originalPost.repostCount = (originalPost.repostCount || 0) + 1;
                originalPostCount = originalPost.repostCount;
                await originalPost.save();
            }
        }

        // Populate the repost data for response
        const populatedRepost = await Post.findById(repost._id)
            .populate('user', 'username displayName userImage updateFullName followers')
            .populate('originalCreator', 'displayName updateFullName userImage repostCount')
            .populate({
                path: 'originalPost',
                select: 'createdAt user repostCount',
                populate: {
                    path: 'user',
                    select: 'updateFullName userImage displayName',
                },
            });

        // Get the reposting user's ID
        const userId = repost.user?._id?.toString();

        if (!userId) {
            throw new Error("Repost user ID is missing or undefined.");
        }

        // Fetch followers of the reposting user
        const userWithFollowers = await User.findById(userId, 'followers');
        if (!userWithFollowers) {
            throw new Error("Repost user not found.");
        }

        const followers = userWithFollowers.followers || []; // Fallback to an empty array
        const followerCount = followers.length; // Calculate follower count

        console.log("Fetched followers:", followerCount);

        // Prepare the recipient list (include the reposting user and their followers)       
        const recipients = [...new Set([...followers.map(follower => follower.toString()), userId])];
        console.log("Final Recipients:", recipients);



        // Broadcast the repost update
        broadcast(req.wss, {
            repostedPost: populatedRepost,
            repostedPostId: repostedPost._id,
            repostedPostCount: repostedPost.repostCount,
            originalPostId: originalPostId,
            originalPostCount: originalPostCount,
            followerCount: followerCount,
        }, 'repost', recipients);


        // Respond with the populated repost
        res.status(201).json(populatedRepost);
        console.log("Repost user and followers broadcasted.");


    } catch (error) {
        res.status(500).json({ message: 'Error creating repost', error: error.message });
    }
});


//post like
router.post('/:id/like', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const userId = req.user.id;
        if (post.likes.includes(userId)) {
            post.likes = post.likes.filter((id) => id.toString() !== userId); // Unlike
        } else {
            post.likes.push(userId); // Like
        }

        await post.save();

        await post.populate('user', 'displayName username updateFullName userImage followers');

        // Broadcast the new comment via WebSocket
        if (post.likes.length >= 5 || post.comments.length >= 5) {
            broadcast(req.wss, post, 'filteredPost');
        }
        // broadcast(req.wss, post, 'likePost');  // Use the WebSocket server instance from `req.wss`
        broadcast(req.wss, { _id: post._id, likes: post.likes }, 'likePost');

        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Error liking post', error: error.message });
    }
});



router.post('/:postId/share', protect, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id; // Assuming `req.user` contains authenticated user info.

        // Find the post to be shared
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check if the user already shared the post
        const alreadyShared = post.shares.some((id) => id.toString() === userId);
        if (alreadyShared) {
            return res.status(400).json({ message: 'You have already shared this post.' });
        }

        // Add the user's ID to the shares array
        post.shares.push(userId);

        // Increment the share count
        post.shareCount += 1;

        // Save the updated post
        await post.save();

        broadcast(req.wss, {
            postId: post._id,
            updatedShareCount: post.shareCount,
        }, 'share');


        res.status(200).json({
            message: 'Post shared successfully',
            shareCount: post.shareCount,
            shares: post.shares,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error sharing post', error: error.message });
    }
});


// Bookmark a post
router.post('/:postId/bookmark', protect, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id; // Authenticated user

        // Find the post
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check if the post is already bookmarked by the user
        const isBookmarked = post.bookmarkedBy.includes(userId);

        if (isBookmarked) {
            // Remove the bookmark
            post.bookmarkedBy = post.bookmarkedBy.filter((id) => id.toString() !== userId);
            post.bookmarkCount -= 1;
        } else {
            // Add the bookmark
            post.bookmarkedBy.push(userId);
            post.bookmarkCount += 1;
        }

        // Save the post
        await post.save();

        // Broadcast real-time update
        broadcast(req.wss, {
            postId: post._id,
            updatedBookmarkCount: post.bookmarkCount,
        }, 'bookmarkUpdate');

        res.status(200).json({
            message: `Post ${isBookmarked ? 'unbookmarked' : 'bookmarked'} successfully`,
            isBookmarked: !isBookmarked,
            bookmarkCount: post.bookmarkCount,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error bookmarking post', error: error.message });
    }
});

//report a post
router.post('/:postId/report', protect, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id; // Authenticated user

        // Find the post
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check if the user already reported the post
        const alreadyReported = post.reportedBy.includes(userId);
        if (alreadyReported) {
            return res.status(400).json({ message: 'You have already reported this post.' });
        }

        // Add the user's ID to the reportedBy array and increment reportCount
        post.reportedBy.push(userId);
        post.reportCount += 1;

        // Set isReported flag to true if reportCount exceeds a threshold (e.g., 5 reports)
        if (post.reportCount >= 5) {
            post.isReported = true;
        }

        // Save the post
        await post.save();

        // Broadcast real-time update
        broadcast(req.wss, {
            postId: post._id,
            updatedReportCount: post.reportCount,
            isReported: post.isReported,
        }, 'reportUpdate');

        res.status(200).json({
            message: 'Post reported successfully',
            reportCount: post.reportCount,
            isReported: post.isReported,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error reporting post', error: error.message });
    }
});


// Comment on a post
router.post('/:id/comment', protect, async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = { user: req.user.id, text };
        post.comments.push(comment);
        await post.save();

        // Repopulate comments to include user details
        const updatedPost = await Post.findById(req.params.id)
            .populate('user', 'displayName username updateFullName userImage followers')
            .populate('comments.user', 'displayName updateFullName userImage');

        // Extract the latest comment with populated user details
        const populatedComment = updatedPost.comments[updatedPost.comments.length - 1];

        // Broadcast the new comment via WebSocket
        if (updatedPost.likes.length >= 5 || updatedPost.comments.length >= 5) {
            broadcast(req.wss, updatedPost, 'filteredPost');
        }

        broadcast(req.wss, { postId: post._id, comment: populatedComment }, 'newComment');
        //Optionally, broadcast the new comment to other users via WebSocket
        //broadcast(req.wss, { postId: post._id, comment }, 'newComment');
        res.status(201).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: 'Error commenting on post', error: error.message });
    }
});


// Like on a Comment on post
router.post('/:postId/comment/:commentId/like', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        let likes;
        if (comment.likes.includes(req.user.id)) {
            // Unlike the comment
            comment.likes = comment.likes.filter((userId) => userId.toString() !== req.user.id);
        } else {
            // Like the comment
            comment.likes.push(req.user.id);
        }

        likes = comment.likes; // Assign the updated likes array
        await post.save();

        // Broadcast the updated likes for the comment
        broadcast(req.wss, {
            postId: post._id,
            commentId: comment._id,
            likes: comment.likes, // Send updated likes
        }, 'commentLike');

        res.status(200).json({ likes });
        console.log('Updated likes:', likes);
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error liking comment', error: error.message });
        } else {
            console.error('Response already sent:', error.message);
        }
    }
});

//report on a comment
router.post('/:postId/comments/:commentId/report', protect, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user.id; // Authenticated user

        // Find the post and comment
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        // Check if the user already reported the comment
        const alreadyReported = comment.reportedBy.includes(userId);
        if (alreadyReported) {
            return res.status(400).json({ message: 'You have already reported this comment.' });
        }

        // Add the user's ID to the reportedBy array and increment reportCount
        comment.reportedBy.push(userId);
        comment.reportCount += 1;

        // Set isReported flag to true if reportCount exceeds a threshold (e.g., 3 reports)
        if (comment.reportCount >= 5) {
            comment.isReported = true;
        }

        // Save the post with the updated comment
        await post.save();

        // Broadcast real-time update
        broadcast(req.wss, {
            postId: post._id,
            commentId: comment._id,
            updatedReportCount: comment.reportCount,
            isReported: comment.isReported,
        }, 'commentReportUpdate');

        res.status(200).json({
            message: 'Comment reported successfully',
            reportCount: comment.reportCount,
            isReported: comment.isReported,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error reporting comment', error: error.message });
    }
});


//working fine for get all post
// router.get('/', protect, async (req, res) => {
//     try {
//         const currentUserId = req.user.id;

//         const posts = await Post.find()
//             .populate('user', 'username displayName userImage updateFullName followers') // Populates the post creator
//             .populate('comments.user', 'displayName updateFullName userImage') // Populates the user in comments
//             .populate('originalCreator', 'displayName updateFullName userImage') // Populates the original creator of the post
//             .populate({
//                 path: 'originalPost',
//                 select: 'createdAt user repostCount', // Select fields from the original post
//                 populate: {
//                     path: 'user', // Populate the user of the original post
//                     select: 'updateFullName userImage displayName', // Select fields from the user
//                 },
//             })
//             .sort({ createdAt: -1 });

//         // Add `isFollowed` property for each post's user
//         const postsWithFollowStatus = posts.map((post) => ({
//             ...post._doc, // Spread the post document
//             user: {
//                 ...post.user?._doc, // Spread the populated user document
//                 isFollowed: post.user?.followers?.some((id) => id.toString() === currentUserId),
//             },
//             likeCount: post.likes.length, // Include the like count
//             repostDetails: post.originalPost
//                 ? {
//                     originalCreator: post.originalCreator, // Original creator of the content
//                     originalPost: post.originalPost, // Reference to the original post
//                 }
//                 : null, // If not a repost, no additional details
//         }));
//         // broadcast(req.wss, postsWithFollowStatus);  // Use the WebSocket server instance from `req.wss`
//         res.status(200).json(postsWithFollowStatus);
//         console.log("get post", postsWithFollowStatus);

//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching posts', error: error.message });
//     }
// });


//get filtered post
router.get('/', protect, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // Find the users that the current user is following
        const currentUser = await User.findById(currentUserId).select('following');
        const following = currentUser?.following || [];

        // Fetch posts meeting the criteria
        const posts = await Post.find({
            $or: [
                { 'likes.4': { $exists: true } }, // At least 5 likes
                { 'comments.5': { $exists: true } }, // More than 5 comments
                { user: { $in: following } }, // Posts from followed users               
                { user: currentUserId }, // Posts by the current user
            ],
        })
            .populate('user', 'username displayName userImage updateFullName followers') // Populate post creator
            .populate('comments.user', 'displayName updateFullName userImage') // Populate comment users
            .populate('originalCreator', 'displayName updateFullName userImage') // Populate original creator
            .populate({
                path: 'originalPost',
                select: 'createdAt user repostCount', // Select fields from the original post
                populate: {
                    path: 'user', // Populate the user of the original post
                    select: 'updateFullName userImage displayName', // Select fields from the user
                },
            })
            .sort({ createdAt: -1 }); // Latest posts first

        // Add `isFollowed` for each post's user
        const postsWithFollowStatus = posts.map((post) => ({
            ...post._doc,
            user: {
                ...post.user?._doc,
                isFollowed: post.user?.followers?.some((id) => id.toString() === currentUserId),
            },
            likeCount: post.likes.length,
            repostDetails: post.originalPost
                ? {
                    originalCreator: post.originalCreator,
                    originalPost: post.originalPost,
                }
                : null,
        }));

        //broadcast(req.wss, postsWithFollowStatus, 'newPost');

        res.status(200).json(postsWithFollowStatus);
        //console.log("Filtered posts for User A:", postsWithFollowStatus);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching posts', error: error.message });
    }
});










module.exports = router;
