const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middlewares/authMiddleware');

const Donation = require('../models/Donation');
const Beneficiary = require('../models/Beneficiary');
const router = express.Router();
const { User } = require('../models/User');
const { broadcast } = require('../utils/websocketUtils');


router.get('/', (req, res) => {
  res.json({ message: `Welcome to the Donations!` });
});

const updateDonationStatus = async (beneficiary, donation, amount, session) => {
  const donationAmount = parseFloat(amount); // Convert to number
  const expectedAmount = parseFloat(beneficiary.expectedAmountOfMoney); // Convert expectedAmount to number

  if (!isNaN(donationAmount)) {
    beneficiary.fundRaised = (parseFloat(beneficiary.fundRaised) || 0) + donationAmount;

    if (beneficiary.fundRaised >= expectedAmount) {
      beneficiary.donationStatus = 'in-progress';
      donation.status = 'in-progress';
    } else {
      beneficiary.donationStatus = 'start received';
      donation.status = 'start received';
    }

    await beneficiary.save({ session });
    await donation.save({ session });
  } else {
    console.error('Invalid donation amount:', amount);
  }
};

// POST route for donations
router.post("/make-donation", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { donorId, beneficiaryId, type, donationType, amount, description, bloodUnitsDonated, donateVia } = req.body;
    console.log("body", req.body);


    // Validate donation type
    const validDonationTypes = [
      'Books', 'Learning Material', 'Learning Gadgets', 'Mentorship',
      'Medications', 'Hospital Assistance', 'Blood',
      'Clothes for Underprivileged', 'Food for the Hungry', "Quality Education", "Shelter", "Employment",
      'Volunteering', 'Fundraising'
    ];

    if (!validDonationTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid donation type" });
    }

    // Validate mandatory fields
    if (!donorId || !beneficiaryId || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate mandatory fields
    if (!donateVia) {
      return res.status(400).json({ error: "Please Select an Option! its required!" });
    }

    if (type === 'Fundraising' && (!amount || amount <= 0)) {
      return res.status(400).json({ error: "Invalid amount for Fundraising" });
    }

    if (type === 'Blood' && (!bloodUnitsDonated || bloodUnitsDonated <= 0)) {
      return res.status(400).json({ error: "Invalid blood donation units" });
    }

    // Create a donation record
    const donation = new Donation({
      donor: donorId,
      beneficiary: beneficiaryId,
      type,
      donationType,
      donateVia,
      amount: type === 'Fundraising' ? amount : null,
      description: type !== 'Fundraising' ? description : null,
      bloodUnitsDonated: type === 'Blood' ? bloodUnitsDonated : null,
      status: 'pending' // Default status
    });

    await donation.save({ session });

    const beneficiary = await Beneficiary.findById(beneficiaryId).session(session);
    if (!beneficiary) {
      throw new Error('Beneficiary not found');
    }

    if (type === 'Blood') {
      beneficiary.bloodGroupUnitReceived += bloodUnitsDonated;

      if (beneficiary.bloodGroupUnitReceived >= beneficiary.bloodGroupUnitNeed) {
        beneficiary.donationStatus = 'in-progress';
        donation.status = 'in-progress';
      } else {
        donation.status = 'start received';
      }

    } else if (type === 'Mentorship') {
      beneficiary.donationStatus = 'in-progress';
      donation.status = 'in-progress';
    }
    else if (type === 'Fundraising') {
      await updateDonationStatus(beneficiary, donation, amount, session);
    }
    else {
      if (donateVia === "I want to donate the expected amount." || donateVia === "I want to Donate the Partial of the Expected Amount.") {
        await updateDonationStatus(beneficiary, donation, amount, session);
      } else {
        beneficiary.donationStatus = 'in-progress';
        donation.status = 'in-progress';
      }
    }

    // Save once at the end
    await beneficiary.save({ session });
    await donation.save({ session });


    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Donation recorded successfully", donation });
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});








//get donor interms of beneficiary
router.get("/donations/:id", async (req, res) => {
  try {
    // Use findOne to get the specific beneficiary
    console.log("Id Bene", req.params.id);


    const beneficiary = await Beneficiary.findOne({ _id: req.params.id });

    console.log("idd of bene f", beneficiary);

    if (!beneficiary) {
      return res.status(404).json({ message: "Beneficiary not found" });
    }

    // Now, find the donations related to the beneficiary
    const donations = await Donation.find({ beneficiary: beneficiary._id })
      .populate('donor', 'updateFullName username email mobile addres city district state PIN'); // Populate donor info

    res.status(200).json({ donations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




//marked donation as fulfilled
router.put("/donations/:id/fulfill", async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: "Donation not found" });
    }

    donation.status = 'fulfilled';
    await donation.save();

    res.status(200).json({ message: "Donation marked as fulfilled", donation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// PUT route for registered users (authenticated)
router.put("/mark-blood-donor", protect, async (req, res) => {
  try {
    const donorId = req.user._id;  // Ensure user is authenticated
    console.log("donorId", donorId);

    const { donorType, name, email, realTimeAddress, realTimeLocation, mobile, bloodGroup, age, bp } = req.body;

    // If the user has blood pressure or diabetes, set a flag to indicate the condition
    let alertMessage = '';
    if (bp === "yes") {
      alertMessage = 'Warning: The user has blood pressure or diabetes condition. Please take extra care.';
    }

    const donor = await User.findById(donorId);
    if (donor) {
      donor.isBloodDonor = true;
      donor.contributorType = donorType;
      donor.donorhaveAnySugarBP = bp;
      donor.updateFullName = name;
      donor.mobile = mobile;
      donor.realTimeAddress = realTimeAddress;
      donor.realTimeLocation = realTimeLocation;
      donor.bloodGroup = bloodGroup;
      donor.age = age;
      await donor.save();


      // // ✅ Broadcast when new blood donor registerd
      // broadcast(req.wss, donor, "Mark_as_BD");

      if (alertMessage) {
        return res.status(200).json({
          message: "Blood donor details updated successfully",
          alert: alertMessage, // Include the alert message
        });
      } else {
        return res.status(200).json({ message: "Blood donor details updated successfully" });
      }


    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




// POST route for non-users (create new blood donor)
router.post("/create-blood-donor", async (req, res) => {
  try {
    const { donorType, name, email, address, district, city, state, PIN, realTimeAddress, realTimeLocation, mobile, bloodGroup, age, bp } = req.body;

    // Check if the email already exists in the Donation model (i.e., the user is already a donor)
    const existingDonor = await Donation.findOne({ donorPhone: mobile });

    if (existingDonor && existingDonor.isBloodDonor) {
      // If donor exists, respond with an error message
      return res.status(400).json({
        message: "This user is already registered as a blood donor. Multiple submissions are not allowed.",
      });
    }

    // If the user has blood pressure or diabetes, set a flag to indicate the condition
    let alertMessage = '';
    if (bp === "yes") {
      alertMessage = 'Warning: The user has blood pressure or diabetes condition. Please take extra care.';
    }

    // Create a new blood donor entry
    const bloodDonor = new Donation({
      isBloodDonor: true,
      type: 'Blood',
      donationType: 'healthCare',
      contributorType: donorType,
      donorhaveAnySugarBP: bp,
      donorName: name,
      donorEmail: email,
      donorAddress: address,
      donorCity: city,
      donorDistrict: district,
      donorState: state,
      donorPIN: PIN,
      realTimeAddress: realTimeAddress,
      realTimeLocation: realTimeLocation,
      donorPhone: mobile,
      donorBloodGrp: bloodGroup,
      donorAge: age,
    });

    // Save the blood donor record
    await bloodDonor.save();

    // Respond with an alert message if bp is true
    if (alertMessage) {
      return res.status(201).json({
        message: "Blood donor created successfully",
        alert: alertMessage, // Include the alert message
      });
    } else {
      return res.status(201).json({ message: "Blood donor created successfully" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// PUT route for registered users (authenticated)
router.put("/mark-as-mentor", protect, async (req, res) => {
  try {
    const donorId = req.user._id;  // Ensure user is authenticated
    console.log("donorId", donorId);

    const { donorType, name, email, realTimeAddress, realTimeLocation, mobile, mentorshipSub, provideVia, } = req.body;

    // If the user has blood pressure or diabetes, set a flag to indicate the condition


    const donor = await User.findById(donorId);
    if (donor) {
      donor.isMentor = true;
      donor.contributorType = donorType;
      donor.updateFullName = name;
      donor.mobile = mobile;

      donor.realTimeAddress = realTimeAddress;
      donor.realTimeLocation = realTimeLocation;
      donor.mentorshipSub = mentorshipSub,
        donor.provideVia = provideVia,
        await donor.save();


      return res.status(200).json({ message: "Mentor details updated successfully" });


    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// POST route for non-users (create new blood donor)
router.post("/create-mentor", async (req, res) => {
  try {
    const { donorType, name, email, address, city, district, state, PIN, realTimeAddress, realTimeLocation, mobile, mentorshipSub, provideVia } = req.body;

    // Check if the email already exists in the Donation model (i.e., the user is already a donor)
    const existingDonor = await Donation.findOne({ donorPhone: mobile });

    if (existingDonor && existingDonor.isMentor) {
      // If donor exists, respond with an error message
      return res.status(400).json({
        message: "This user is already registered as a Mentor. Multiple submissions are not allowed.",
      });
    }



    // Create a new blood donor entry
    const mentor = new Donation({
      isMentor: true,
      type: 'Mentorship',
      donationType: 'empowerSkillAndKnowledge',
      contributorType: donorType,
      donorName: name,
      donorEmail: email,
      donorAddress: address,
      donorCity: city,
      donorDistrict: district,
      donorState: state,
      donorPIN: PIN,
      realTimeAddress: realTimeAddress,
      realTimeLocation: realTimeLocation,
      donorPhone: mobile,
      mentorshipSub: mentorshipSub,
      provideVia: provideVia,
    });

    // Save the blood donor record
    await mentor.save();


    return res.status(201).json({ message: "New Mentor created successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});















module.exports = router;