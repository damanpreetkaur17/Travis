require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = express();

// ---------------------
//  UPDATED CORS SETTINGS
// ---------------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174", // your current frontend port
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ---------------------
//  PARSERS
// ---------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------
//  MONGODB CONNECTION
// ---------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ---------------------
//  USER SCHEMA & MODEL
// ---------------------
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  googleId: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

// ---------------------
//      SIGNUP
// ---------------------
app.post("/signup", async (req, res) => {
  console.log("📩 Incoming Signup Request:", req.body);

  const { email, password, name } = req.body;

  try {
    if (!email || !password || !name) {
      return res.json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    const token = jwt.sign({ email, name }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      message: "Account created successfully!",
      token,
      user: { email, name },
    });
  } catch (error) {
    console.log("❌ Signup Error:", error);
    res.json({ success: false, message: "Signup failed" });
  }
});

// ---------------------
//        LOGIN
// ---------------------
app.post("/login", async (req, res) => {
  console.log("📩 Incoming Login Request:", req.body);

  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign(
      { email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful!",
      token,
      user: { email: user.email, name: user.name },
    });
  } catch (error) {
    console.log("❌ Login Error:", error);
    res.json({ success: false, message: "Login failed" });
  }
});

// ---------------------
//    GOOGLE SIGN-IN
// ---------------------
app.post("/google-signin", async (req, res) => {
  console.log("📩 Incoming Google Sign-In Request:", req.body);

  const { email, name, googleId } = req.body;

  try {
    if (!email || !googleId) {
      return res.json({ success: false, message: "Google sign-in failed" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        googleId,
      });
      await user.save();
    }

    const token = jwt.sign({ email, name }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      message: "Google sign-in successful!",
      token,
      user: { email, name },
    });
  } catch (error) {
    console.log("❌ Google Sign-In Error:", error);
    res.json({ success: false, message: "Google sign-in failed" });
  }
});

// ---------------------
//     VERIFY TOKEN
// ---------------------
app.post("/verify-token", (req, res) => {
  console.log("📩 Incoming token verification:", req.body);

  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (error) {
    res.json({ success: false, message: "Invalid or expired token" });
  }
});

// ---------------------
app.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on port ${process.env.PORT}`)
);
