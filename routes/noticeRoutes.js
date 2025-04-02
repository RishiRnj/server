// routes/noticeRoutes.js
const express = require("express");
const {
  createNotice,
  getNotices,
  updateNotice,
  deleteNotice,
} = require("../controllers/noticeController");
const { authenticateAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", authenticateAdmin, createNotice);
router.get("/", getNotices);
router.put("/:id", authenticateAdmin, updateNotice);
router.delete("/:id", authenticateAdmin, deleteNotice);

module.exports = router;
