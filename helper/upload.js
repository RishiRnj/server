// const multer = require("multer");

// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   fileFilter: (req, file, cb) => {
//     console.log("Incoming File:", file);
//     if (file.mimetype.startsWith("image/")) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only image files are allowed!"), false);
//     }
//   },
// }).single("userImage");

// module.exports = upload;


const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log("Incoming File:", file);
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
}).single("userImage");

module.exports = upload;
