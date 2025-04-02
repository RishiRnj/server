const express = require("express");

const crypto = require("crypto");

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

router.get("/", (req, res) => {
    res.json({ message: `Welcome to the Payments!` });
});

// Create Order API
router.post("/create-order", async (req, res) => {
  try {
      const { amount, currency } = req.body;

      const options = {
          amount: amount * 100, // Convert to paise
          currency: currency || "INR",
          receipt: `order_rcpt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      res.json(order);
  } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: error.message });
  }
});


// Verify Payment API
router.post("/verify-payment", (req, res) => {
  try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
          .createHmac("sha256", process.env.KEY_SECRET)
          .update(body)
          .digest("hex");

      if (expectedSignature === razorpay_signature) {
          res.json({ success: true, message: "Payment Verified Successfully!" });
      } else {
          res.status(400).json({ success: false, message: "Payment Verification Failed!" });
      }
  } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


// CREATE Payment API
router.post("/create-payment", async (req, res) => {
    try {
      const { amount, currency } = req.body;
  
      const options = {
        amount: amount * 100, // Convert to smallest currency unit (paise)
        currency: currency || "INR",
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1, // Auto-capture payment
      };
  
      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

module.exports = router;
