require("dotenv").config();

const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const twilio = require("twilio");

const app = express();

// Render PORT + local PORT
const PORT = process.env.PORT || 5000;

// =========================
// MONGODB
// =========================

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("ERROR: MONGO_URI is not set!");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
});

// =========================
// TWILIO
// =========================

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// =========================
// HTTP SERVER + SOCKET.IO
// =========================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
  },
});

// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());

// =========================
// SOCKET CONNECTION
// =========================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// =========================
// DATABASE CONNECTION
// =========================

async function connectDB() {
  try {
    await client.connect();

    // Test database connection
    await client.db("LocalConnect").command({ ping: 1 });

    console.log("MongoDB Connected Successfully!");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
}

// =========================
// HOME
// =========================

app.get("/", (req, res) => {
  res.send("LocalConnect Backend is Running!");
});

// =========================
// REGISTER
// =========================

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please fill all registration details",
      });
    }

    const db = client.db("LocalConnect");
    const users = db.collection("users");

    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    await users.insertOne({
      name,
      email,
      password,
      createdAt: new Date(),
    });

    console.log("Registration Successful");
    console.log("Name:", name);
    console.log("Email:", email);

    res.json({
      message: "Registration successful!",
    });
  } catch (error) {
    console.error("Registration Error:", error);

    res.status(500).json({
      message: "Registration failed",
    });
  }
});

// =========================
// LOGIN
// =========================

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password",
      });
    }

    const db = client.db("LocalConnect");
    const users = db.collection("users");

    const user = await users.findOne({
      email: email,
      password: password,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    console.log("Login Successful:", email);

    res.json({
      message: "Login successful!",
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
});

// =========================
// BOOKING
// =========================

app.post("/book", async (req, res) => {
  try {
    const { name, provider, date, time } = req.body;

    if (!name || !provider || !date || !time) {
      return res.status(400).json({
        message: "Please fill all booking details",
      });
    }

    const db = client.db("LocalConnect");
    const bookings = db.collection("bookings");

    const result = await bookings.insertOne({
      name,
      provider,
      date,
      time,
      status: "confirmed",
      createdAt: new Date(),
    });

    console.log("Booking Saved Successfully!");
    console.log("Booking ID:", result.insertedId);

    // =========================
    // TWILIO SMS
    // =========================

    try {
      await twilioClient.messages.create({
        body: `LocalConnect booking confirmed for ${date} at ${time}.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.TWILIO_TO_PHONE_NUMBER,
      });

      console.log("SMS sent successfully!");
    } catch (smsError) {
      console.error("SMS Error:", smsError);
    }

    // =========================
    // SOCKET.IO
    // =========================

    io.emit("newBooking", {
      bookingId: result.insertedId.toString(),
      name,
      provider,
      date,
      time,
      status: "confirmed",
    });

    res.json({
      message: "Booking confirmed successfully!",
      bookingId: result.insertedId,
    });
  } catch (error) {
    console.error("Booking Error:", error);

    res.status(500).json({
      message: "Booking failed",
    });
  }
});

// =========================
// GET ALL BOOKINGS
// =========================

app.get("/bookings", async (req, res) => {
  try {
    const db = client.db("LocalConnect");
    const bookings = db.collection("bookings");

    const data = await bookings
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json(data);
  } catch (error) {
    console.error("Get Bookings Error:", error);

    res.status(500).json({
      message: "Unable to get bookings",
    });
  }
});

// =========================
// GET USER BOOKINGS
// =========================

app.get("/bookings/:name", async (req, res) => {
  try {
    const { name } = req.params;

    const db = client.db("LocalConnect");
    const bookings = db.collection("bookings");

    const userBookings = await bookings
      .find({ name })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(userBookings);
  } catch (error) {
    console.error("Fetch Bookings Error:", error);

    res.status(500).json({
      message: "Failed to fetch bookings",
    });
  }
});

// =========================
// CANCEL BOOKING
// =========================

app.delete("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    const db = client.db("LocalConnect");
    const bookings = db.collection("bookings");

    const result = await bookings.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "Cancelled",
          cancelledAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    console.log("Booking Cancelled:", id);

    io.emit("bookingCancelled", {
      bookingId: id,
      status: "Cancelled",
    });

    res.json({
      message: "Booking cancelled successfully!",
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error);

    res.status(500).json({
      message: "Failed to cancel booking",
    });
  }
});

// =========================
// START SERVER
// =========================

async function startServer() {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
      console.log("Socket.IO is running!");
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();