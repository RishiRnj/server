const express = require("express");
const crypto = require("crypto");

const router = express.Router();
const RAZORPAY_SECRET = process.env.KEY_SECRET; // Keep this secure

router.post("/webhook", (req, res) => {
  const receivedSignature = req.headers["x-razorpay-signature"];

  // Generate expected signature
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (receivedSignature === expectedSignature) {
    console.log("✅ Webhook Verified!");

    const { event, payload } = req.body;

    if (event === "payment.authorized") {
      console.log("Payment Authorized:", payload.payment.entity);
      // Update database status here
    } else if (event === "payment.failed") {
      console.log("Payment Failed:", payload.payment.entity);
    }

    res.status(200).json({ status: "ok" });
  } else {
    console.log("⚠️ Webhook Verification Failed");
    res.status(400).json({ status: "error" });
  }
});

module.exports = router;
