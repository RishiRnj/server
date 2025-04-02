// controllers/noticeController.js
const Notice = require("../models/Notice");

// Create a new notice
exports.createNotice = async (req, res) => {
  try {
    const { text, link } = req.body;
    const notice = new Notice({ text, link });
    await notice.save();
    res.status(201).json(notice);
  } catch (error) {
    res.status(500).json({ message: "Failed to create notice", error });
  }
};

// Fetch all notices
exports.getNotices = async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.status(200).json(notices);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notices", error });
  }
};

// Update a notice
exports.updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedNotice = await Notice.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json(updatedNotice);
  } catch (error) {
    res.status(500).json({ message: "Failed to update notice", error });
  }
};

// Delete a notice
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    await Notice.findByIdAndDelete(id);
    res.status(200).json({ message: "Notice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete notice", error });
  }
};
