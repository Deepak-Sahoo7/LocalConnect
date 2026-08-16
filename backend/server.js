require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const twilio = require("twilio");

const uri =
  "mongodb+srv://localconnect:localconnect7711@cluster0.g386evd.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri);

const app = express();
const PORT = 5000;
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
// SOCKET CONNECTION
// =========================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());

// =========================
// MONGODB CONNECTION
// =========================

async function connectDB() {
  try {
    await client.connect();
    console.log("MongoDB Connected Successfully!");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
  }
}

connectDB();

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
      name: name,
      provider: provider,
      date: date,
      time: time,
      status: "confirmed",
      createdAt: new Date(),
    });
    // Send SMS using Twilio
await twilioClient.messages.create({
  body: "sms_appointment_reminders",
  from: process.env.TWILIO_PHONE_NUMBER,
  to: "+916371579908"
});
    console.log("Booking Saved Successfully!");
    console.log("Booking ID:", result.insertedId);
    console.log("Name:", name);
    console.log("Provider:", provider);
    console.log("Date:", date);
    console.log("Time:", time);

    // =========================
    // SOCKET.IO BOOKING EVENT
    // =========================

    io.emit("newBooking", {
      bookingId: result.insertedId.toString(),
      name: name,
      provider: provider,
      date: date,
      time: time,
      status: "confirmed",
    });

    console.log("Real-time booking notification sent!");

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
      .find({ name: name })
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

    // =========================
    // SOCKET.IO CANCEL EVENT
    // =========================

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

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log("Socket.IO is running!");
});