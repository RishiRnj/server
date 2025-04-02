const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const { User } = require('../models/User');
const { protect, authenticateAdmin, protectBlogPost } = require('../middlewares/authMiddleware');
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const stream = require('stream'); // Add this import for stream
const { broadcast } = require('../utils/websocketUtils');
const fs = require('fs');
const path = require('path');
const Handbrake = require('handbrake-js');
const sharp = require('sharp');
const { log } = require('console');


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
                    folder: 'Blog-Uploads-img',
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
            preset: 'Very Fast 720p30',
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
        const result = await cloudinary.uploader.upload(outputPath, { resource_type: 'video', folder: 'blog_uploads_vid' }); // Specify the folder where the file will be stored

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

router.get('/', (req, res) => {
    res.json({ message: `Welcome to the BlogPost!` });
});

//create blog post
//   router.post('/create', protect, upload.single('userUpload'), async (req, res) => {
router.post('/create', protect, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
    console.log("blog received file", req.files); // Check uploaded files
    console.log("blog received body", req.body);  // Check form data


    try {

        const { title, content, contentText, category, authorName } = req.body;

        const author = req.user._id; // Assuming `protect` middleware attaches `user`

        let imageUrl = null;
        let videoUrl = null;

        if (req.files?.image) {
            imageUrl = await processImage(req.files.image[0]);
        }
        if (req.files?.video) {
            videoUrl = await processVideo(req.files.video[0]);
        }

        const post = new BlogPost({ title, content, contentText, author, authorName, category, imageUrl, videoUrl });
        await post.save();

        // ✅ Broadcast new post event
        broadcast(req.wss, post, "NEW_POST");
        console.log("Post created br:", req.wss, post);


        res.status(201).json({ success: true, message: "Post created", post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


//Edit a Post
router.put('/edit/:id', protect, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        const post = await BlogPost.findById(req.params.id);

        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        post.title = title || post.title;
        post.content = content || post.content;
        post.category = category || post.category;

        await post.save();
        res.json({ success: true, message: "Post updated", post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


// //Comment on a Post
router.post('/comment/:id', protectBlogPost, async (req, res) => {
    try {
        const { content } = req.body;
        const { id: postId } = req.params;

        if (!content) {
            return res.status(400).json({ success: false, message: "Content is required" });
        }

        if (!postId || postId.length !== 24) {
            return res.status(400).json({ success: false, message: "Invalid post ID" });
        }

        const post = await BlogPost.findById(postId);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        // Create comment object based on user type
        const comment = {
            content,
            post: post._id,
            createdAt: new Date(),
            isGuest: req.user.isGuest, // Will be true for guests
            guestName: "Guest" // Default name
        };

        // If authenticated user, add their ID
        if (!req.user.isGuest) {
            comment.author = req.user._id;
            comment.authorName = req.user.updateFullName; // Use username or any other field you prefer
            comment.isGuest = false;
            comment.guestName = ""; // Clear guest name for registered users
        }

        post.comments.push(comment);
        await post.save();

        // Broadcast comment event
        broadcast(req.wss, post, "BLOG_POST_COMMENT");

        res.status(201).json({ success: true, message: "Comment added", comment });
    } catch (error) {
        console.error("Error in adding comment:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


// // //get Comment on a Post
// router.post('/comment/:id', protectBlogPost, async (req, res) => {
//     try {
//         const { content } = req.body;
//         const { id: postId } = req.params;

//         if (!content) {
//             return res.status(400).json({ success: false, message: "Content is required" });
//         }

//         if (!postId || postId.length !== 24) {
//             return res.status(400).json({ success: false, message: "Invalid post ID" });
//         }

//         const post = await BlogPost.findById(postId);
//         if (!post) return res.status(404).json({ success: false, message: "Post not found" });

//         // Create comment object based on user type
//         const comment = {
//             content,
//             post: post._id,
//             createdAt: new Date(),
//             isGuest: req.user.isGuest, // Will be true for guests
//             guestName: "Guest" // Default name
//         };

//         // If authenticated user, add their ID
//         if (!req.user.isGuest) {
//             comment.author = req.user._id;
//             comment.authorName = req.user.updateFullName; // Use username or any other field you prefer
//             comment.isGuest = false;
//             comment.guestName = ""; // Clear guest name for registered users
//         }

//         post.comments.push(comment);
//         await post.save();

//         // Broadcast comment event
//         broadcast(req.wss, post, "BLOG_POST_COMMENT");

//         res.status(201).json({ success: true, message: "Comment added", comment });
//     } catch (error) {
//         console.error("Error in adding comment:", error);
//         res.status(500).json({ success: false, message: "Server error" });
//     }
// });



//Like a Post
router.post('/like/:id', protectBlogPost, async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: "Post not found" });

        const userId = req.user._id.toString();

        if (post.likes.includes(userId)) {
            post.likes = post.likes.filter(id => id !== userId);
        } else {
            post.likes.push(userId);
        }

        await post.save();

        // ✅ Broadcast the full post instead of only the likes count
        broadcast(req.wss, { postId: post._id, likes: post.likes }, "POST_LIKE_UPDATE");

        // ✅ Send the full post in response
        res.json({ success: true, message: "Like updated", post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});




//Get All Posts (Paginated)
router.get('/all', async (req, res) => {
    try {
        const { page = 1, limit = 5 } = req.query;

        const posts = await BlogPost.find({ status: 'active' })
            .populate('author', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({ success: true, posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


//Get Posts by Month
router.get('/by-month', async (req, res) => {
    try {
        const postsByMonth = await BlogPost.getPostsByMonth();
        res.json({ success: true, postsByMonth });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});




//Auto-Archive Posts (Run as a Cron Job)
router.post('/archive', authenticateAdmin, async (req, res) => {
    try {
        await BlogPost.archiveOldPosts();
        res.json({ success: true, message: "Old posts archived" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});




























module.exports = router;
