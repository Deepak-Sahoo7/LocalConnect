import "./App.css";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const services = [
    ["⚡", "Electrician", "₹299", "4.8"],
    ["🔧", "Plumber", "₹249", "4.7"],
    ["🧹", "Cleaning", "₹199", "4.6"],
    ["❄️", "AC Repair", "₹399", "4.8"],
    ["🎨", "Painter", "₹499", "4.6"],
    ["🪚", "Carpenter", "₹349", "4.7"],
    ["🚗", "Mechanic", "₹399", "4.6"],
    ["💻", "Tutor", "₹299", "4.9"],
  ];

 const providers = [
  ["👨‍🔧", "Rakesh Electrician", "Electrician", "4.8", "2.3 km", "Bhubaneswar"],
  ["👨‍🔧", "Sunil Plumber", "Plumber", "4.7", "1.8 km", "Bhubaneswar"],
  ["🧹", "John Cleaning", "Cleaning", "4.6", "2.1 km", "Cuttack"],
  ["👨‍🔧", "Amit AC Repair", "AC Repair", "4.8", "2.5 km", "Puri"],
];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const [name, setName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [showBooking, setShowBooking] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [loggedInName, setLoggedInName] = useState("");

  const [selectedProvider, setSelectedProvider] = useState("");

  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");

  const [searchService, setSearchService] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [notification, setNotification] = useState("");

  // =========================
  // SOCKET.IO REAL-TIME EVENTS
  // =========================

  useEffect(() => {
    const handleNewBooking = (booking) => {
      setNotification(
        `🔔 New booking: ${booking.provider} - ${booking.date} at ${booking.time}`
      );

      setTimeout(() => {
        setNotification("");
      }, 5000);
    };

    const handleBookingCancelled = () => {
      setNotification("❌ A booking has been cancelled.");

      setTimeout(() => {
        setNotification("");
      }, 5000);
    };

    socket.on("newBooking", handleNewBooking);
    socket.on("bookingCancelled", handleBookingCancelled);

    return () => {
      socket.off("newBooking", handleNewBooking);
      socket.off("bookingCancelled", handleBookingCancelled);
    };
  }, []);

  // FILTER SERVICES
  const filteredServices = services.filter((service) =>
    service[1].toLowerCase().includes(searchService.toLowerCase())
  );
const filteredProviders = providers.filter((provider) => {
  const serviceMatch =
    !searchService.trim() ||
    provider[2]
      .toLowerCase()
      .includes(searchService.toLowerCase());

  const locationMatch =
    !searchLocation.trim() ||
    provider[5]
      .toLowerCase()
      .includes(searchLocation.toLowerCase());

  return serviceMatch && locationMatch;
});
  // Keep the home page visible after login so logged-in users can still book services.

  return (
    <div className="app">

      {notification && (
        <div
          className="fixed right-5 top-5 z-[10000] rounded-xl px-5 py-4 font-semibold shadow-2xl"
          style={{
            background: "#00d9c0",
            color: "#071321",
          }}
        >
          {notification}
        </div>
      )}

      {/* ================= BOOKING POPUP ================= */}

      {showBooking && isLoggedIn && (
        <div className="booking-box">

          <h2>Book Service</h2>

          <p>
            Provider: <strong>{selectedProvider}</strong>
          </p>

          <input
            type="text"
            placeholder="Your name"
            value={loggedInName}
            readOnly
          />

          <input
            type="date"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
          />

          <input
            type="time"
            value={bookingTime}
            onChange={(e) => setBookingTime(e.target.value)}
          />

          <button
            onClick={async () => {
  if (!loggedInName || !bookingDate || !bookingTime) {
    alert("Please fill all details");
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: loggedInName,
        provider: selectedProvider,
        date: bookingDate,
        time: bookingTime,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Booking failed");
      return;
    }

    alert(data.message);

    setShowBooking(false);
    setBookingDate("");
    setBookingTime("");
  } catch (error) {
    console.error("Booking Error:", error);
    alert("Backend is not connected!");
  }
}}
          >
            Confirm Booking
          </button>

          <button onClick={() => setShowBooking(false)}>
            Cancel
          </button>

        </div>
      )}

      {/* ================= NAVBAR ================= */}

      <nav className="navbar">

        <div className="logo">
          <span className="logo-icon">◇</span>
          LocalConnect
        </div>

        <div className="nav-links">
          <a className="active">Home</a>
          <a>Services</a>
          <a>Providers</a>
          <a>About Us</a>
          <a>Contact</a>
        </div>

        <div className="nav-actions">

          <button className="location">
            📍 Bhubaneswar⌄
          </button>

          {isLoggedIn ? (
            <>
              <span style={{ marginRight: "10px" }}>Welcome, {loggedInName}!</span>
              <button
                className="login"
                onClick={async () => {
                  try {
                    const response = await fetch(
                      `http://localhost:5000/bookings/${encodeURIComponent(loggedInName)}`
                    );
                    const data = await response.json();
                    if (response.ok) {
                      setMyBookings(data);
                      setShowBookings(true);
                    } else {
                      alert("Unable to fetch bookings");
                    }
                  } catch (error) {
                    console.error(error);
                    alert("Backend is not connected");
                  }
                }}
              >
                My Bookings
              </button>
              <button
                className="login"
                onClick={() => {
                  setIsLoggedIn(false);
                  setShowBookings(false);
                  setMyBookings([]);
                  setLoggedInName("");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="login"
              onClick={() => setShowLogin(true)}
            >
              Login / Register
            </button>
          )}

        </div>

      </nav>

      {/* ================= MY BOOKINGS ================= */}
      {showBookings && (
  <div
    style={{
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      background: "rgba(0,0,0,0.75)",
      zIndex: 9999,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "20px",
    }}
  >
    <div
      style={{
        background: "#071321",
        color: "white",
        width: "min(600px, 95%)",
        maxHeight: "80vh",
        overflowY: "auto",
        borderRadius: "16px",
        padding: "25px",
        border: "1px solid #00d9c0",
      }}
    >
      <h2 style={{ marginTop: 0 }}>My Bookings</h2>

      {myBookings.length === 0 ? (
        <p>No bookings found for {loggedInName}.</p>
      ) : (
        myBookings.map((booking) => (
          <div
            key={booking._id}
            style={{
              border: "1px solid #244052",
              borderRadius: "12px",
              padding: "15px",
              marginBottom: "12px",
              background: "#0b1b2a",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {booking.provider}
            </h3>

            <p>👤 Name: {booking.name}</p>
            <p>📅 Date: {booking.date}</p>
            <p>⏰ Time: {booking.time}</p>
            <p>
  📌 Status:{" "}
  <strong
    style={{
      color:
        booking.status === "Cancelled"
          ? "#ff4d4d"
          : "#00d9c0",
    }}
  >
    {booking.status || "Confirmed"}{" "}
    {booking.status === "Cancelled" ? "❌" : "✅"}
  </strong>
</p>

            <button
              onClick={async () => {
                const confirmCancel = window.confirm(
                  "Are you sure you want to cancel this booking?"
                );

                if (!confirmCancel) {
                  return;
                }

                try {
                  const response = await fetch(
                    `http://localhost:5000/bookings/${booking._id}`,
                    {
                      method: "DELETE",
                    }
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    alert(data.message || "Failed to cancel booking");
                    return;
                  }

                  alert("Booking cancelled successfully!");

                  // Remove cancelled booking from screen
                  setMyBookings((prevBookings) =>
                    prevBookings.filter(
                      (item) => item._id !== booking._id
                    )
                  );
                } catch (error) {
                  console.error(
                    "Cancel Booking Error:",
                    error
                  );

                  alert("Backend is not connected!");
                }
              }}
              style={{
                background: "#ff4d4d",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
              Cancel Booking
            </button>
          </div>
        ))
      )}

      <button
        className="login"
        onClick={() => setShowBookings(false)}
      >
        Close
      </button>
    </div>
  </div>
)}
      {/* ================= LOGIN MODAL ================= */}

      {showLogin && (
        <div className="login-overlay">

          <div className="login-modal">

            <button
              className="close-login"
              onClick={() => setShowLogin(false)}
            >
              ×
            </button>

            <div className="login-icon">
              ◇
            </div>

            <h2>Welcome to LocalConnect</h2>

            <p className="login-subtitle">
              Login or create your account
            </p>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              className="login-submit"
              onClick={async () => {

                if (!email || !password) {
                  alert("Please enter email and password");
                  return;
                }

                try {

                  const response = await fetch(
                    "http://localhost:5000/login",
                    {
                      method: "POST",

                      headers: {
                        "Content-Type": "application/json",
                      },

                      body: JSON.stringify({
                        email: email,
                        password: password,
                      }),
                    }
                  );

                  const data = await response.json();

                  if (response.ok) {

                    alert("Login successful!");

                   setLoggedInName(data.user.name);
                    setIsLoggedIn(true);

                  } else {

                    alert(data.message || "Login failed");

                  }

                } catch (error) {

                  console.error(error);

                  alert("Backend is not connected");

                }

              }}
            >
              Login
            </button>

            <p className="register-text">

              Don't have an account?{" "}

              <span
                onClick={() => {
                  setShowLogin(false);
                  setShowRegister(true);
                }}
                style={{ cursor: "pointer" }}
              >
                Register
              </span>

            </p>

          </div>

        </div>
      )}

      {/* ================= REGISTER MODAL ================= */}

      {showRegister && (
        <div className="login-overlay">

          <div className="login-modal">

            <button
              className="close-login"
              onClick={() => setShowRegister(false)}
            >
              ✕
            </button>

            <div className="login-icon">
              ◇
            </div>

            <h2>Create Account</h2>

            <p className="login-subtitle">
              Join LocalConnect today
            </p>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="email"
              placeholder="Enter your email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Create password"
              value={registerPassword}
              onChange={(e) =>
                setRegisterPassword(e.target.value)
              }
            />

            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />

            <button
              className="login-submit"
              onClick={async () => {

                if (
                  !name ||
                  !registerEmail ||
                  !registerPassword ||
                  !confirmPassword
                ) {
                  alert("Please fill all fields");
                  return;
                }

                if (registerPassword !== confirmPassword) {
                  alert("Passwords do not match");
                  return;
                }

                try {

                  const response = await fetch(
                    "http://localhost:5000/register",
                    {
                      method: "POST",

                      headers: {
                        "Content-Type": "application/json",
                      },

                      body: JSON.stringify({
                        name: name,
                        email: registerEmail,
                        password: registerPassword,
                      }),
                    }
                  );

                  const data = await response.json();

                  if (response.ok) {

                    alert(data.message || "Registration successful!");

                    setShowRegister(false);
                    setShowLogin(true);

                    setName("");
                    setRegisterEmail("");
                    setRegisterPassword("");
                    setConfirmPassword("");

                  } else {

                    alert(
                      data.message || "Registration failed"
                    );

                  }

                } catch (error) {

                  console.error(error);

                  alert("Backend is not connected");

                }

              }}
            >
              Register
            </button>

            <p className="register-text">

              Already have an account?{" "}

              <span
                onClick={() => {
                  setShowRegister(false);
                  setShowLogin(true);
                }}
                style={{ cursor: "pointer" }}
              >
                Login
              </span>

            </p>

          </div>

        </div>
      )}

      {/* ================= HERO ================= */}

      <section className="hero">

        <div className="hero-content">

          <span className="trusted">
            ✦ Trusted by 10,000+ Customers
          </span>

          <h1 className="font-bold">
  Find Trusted
  <span> Local Services</span>
</h1>

          <p>
            Book reliable professionals near you.
            <br />
            Fast, secure & hassle-free.
          </p>

          {/* SEARCH BOX */}

          <div className="search-box">

            <div>
              🔍

              <input
                placeholder="Search service..."
                value={searchService}
                onChange={(e) =>
                  setSearchService(e.target.value)
                }
              />

            </div>

            <div>
              📍

              <input
                placeholder="Enter location"
                value={searchLocation}
                onChange={(e) =>
                  setSearchLocation(e.target.value)
                }
              />

            </div>

            <button
  onClick={() => {
    if (!searchService.trim() && !searchLocation.trim()) {
      alert("Please enter service or location");
      return;
    }

    // Scroll to Popular Services
    document
      .querySelector(".section")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }}
>
  Search
</button>

          </div>

          {/* STATS */}

          <div className="stats">

            <div>
              <strong>500+</strong>
              <small>Services</small>
            </div>

            <div>
              <strong>10K+</strong>
              <small>Customers</small>
            </div>

            <div>
              <strong>4.8 ⭐</strong>
              <small>Avg Rating</small>
            </div>

            <div>
              <strong>24/7</strong>
              <small>Support</small>
            </div>

          </div>

        </div>

        {/* HERO VISUAL */}

        <div className="hero-visual">

          <div className="glow-circle"></div>

          <div className="house">
            🏠
          </div>

          <div className="service electrician">
            ⚡
            <span>Electrician</span>
          </div>

          <div className="service plumber">
            🔧
            <span>Plumber</span>
          </div>

          <div className="service cleaning">
            🧹
            <span>Cleaning</span>
          </div>

          <div className="service carpenter">
            🪚
            <span>Carpenter</span>
          </div>

          <div className="service painter">
            🎨
            <span>Painter</span>
          </div>

        </div>

      </section>

      {/* ================= POPULAR SERVICES ================= */}

      <section className="section">

        <div className="section-title">

          <div>

            <h2>
              Popular Services
            </h2>

            <p>
              Explore our most in-demand services
            </p>

          </div>

          <button className="view-btn">
            View All →
          </button>

        </div>

        <div className="service-grid">

          {filteredServices.map((service) => (

            <div
              className="service-card"
              key={service[1]}
            >

              <div className="service-icon">
                {service[0]}
              </div>

              <h3>
                {service[1]}
              </h3>

              <p>
                Starting {service[2]}
              </p>

              <span>
                ⭐ {service[3]}
              </span>
              <button
  className="book-btn"
  onClick={() => {
    if (!isLoggedIn) {
      alert("Please login first to book a service.");
      setShowLogin(true);
      return;
    }

    setSelectedProvider(service[1]);
    setShowBooking(true);
  }}
>
  Book Now
</button>

            </div>

          ))}

        </div>

      </section>

      {/* ================= TOP RATED PROVIDERS ================= */}

      <section className="section providers-section">

        <div className="section-title">

          <div>

            <h2>
              Top Rated Providers
            </h2>

            <p>
              Best professionals near you
            </p>

          </div>

          <button className="view-btn">
            View All →
          </button>

        </div>

        <div className="provider-grid">

          {filteredProviders.map((provider) => (

            <div
              className="provider-card"
              key={provider[1]}
            >

              <div className="provider-image">

                {provider[0]}

                <span className="rating">
                  ⭐ {provider[3]}
                </span>

              </div>

              <div className="provider-info">

                <h3>
                  {provider[1]}
                </h3>

                <p className="provider-service">
                  {provider[2]}
                </p>

                <div className="provider-details">

                  <span>
                    ⭐ {provider[3]}
                  </span>

                  <span>
                    📍 {provider[4]}
                  </span>
                  <span>
                    📍 {provider[5]}
                  </span>

                </div>

                <button
                  className="book-btn"
                  onClick={() => {
                    if (!isLoggedIn) {
                      alert("Please login first to book a service.");
                      setShowLogin(true);
                      return;
                    }

                    setSelectedProvider(provider[1]);
                    setShowBooking(true);
                  }}
                >
                  Book Now
                </button>

              </div>

            </div>

          ))}

        </div>

      </section>

      {/* ================= HOW IT WORKS ================= */}

      <section className="how-section">

        <div className="section-heading">

          <h2>
            How It Works
          </h2>

          <p>
            Book a service in 4 simple steps
          </p>

        </div>

        <div className="steps-grid">

          <div className="step-card">

            <div className="step-number">
              01
            </div>

            <div className="step-icon">
              🔍
            </div>

            <h3>
              Search Service
            </h3>

            <p>
              Search for the service you need near you.
            </p>

          </div>

          <div className="step-card">

            <div className="step-number">
              02
            </div>

            <div className="step-icon">
              👨‍🔧
            </div>

            <h3>
              Choose Provider
            </h3>

            <p>
              Select the best verified service provider.
            </p>

          </div>

          <div className="step-card">

            <div className="step-number">
              03
            </div>

            <div className="step-icon">
              📅
            </div>

            <h3>
              Book Service
            </h3>

            <p>
              Choose your date and confirm your booking.
            </p>

          </div>

          <div className="step-card">

            <div className="step-number">
              04
            </div>

            <div className="step-icon">
              ✅
            </div>

            <h3>
              Get It Done
            </h3>

            <p>
              Relax while your professional does the work.
            </p>

          </div>

        </div>

      </section>

      {/* ================= CUSTOMER REVIEWS ================= */}

      <section className="reviews-section">

        <div className="section-heading">

          <h2>
            What Our Customers Say
          </h2>

          <p>
            Real reviews from real people
          </p>

        </div>

        <div className="review-grid">

          <div className="review-card">

            <div className="review-user">

              <div className="avatar">
                RV
              </div>

              <div>

                <h3>
                  Rahul Verma
                </h3>

                <small>
                  Bhubaneswar
                </small>

              </div>

            </div>

            <div className="stars">
              ★★★★★
            </div>

            <p>
              "Very quick response and excellent service.
              Highly recommended!"
            </p>

          </div>

          <div className="review-card">

            <div className="review-user">

              <div className="avatar">
                PS
              </div>

              <div>

                <h3>
                  Priya Sharma
                </h3>

                <small>
                  Cuttack
                </small>

              </div>

            </div>

            <div className="stars">
              ★★★★★
            </div>

            <p>
              "Professional and polite team.
              My AC is working perfectly now."
            </p>

          </div>

          <div className="review-card">

            <div className="review-user">

              <div className="avatar">
                AD
              </div>

              <div>

                <h3>
                  Amit Das
                </h3>

                <small>
                  Puri
                </small>

              </div>

            </div>

            <div className="stars">
              ★★★★★
            </div>

            <p>
              "Booking was easy and the plumber
              arrived on time. Great experience!"
            </p>

          </div>

        </div>

      </section>

      {/* ================= BECOME A PROVIDER ================= */}

      <section className="provider-cta">

        <div className="cta-content">

          <span className="cta-badge">
            💼 For Professionals
          </span>

          <h2>
            Become a Service Provider
          </h2>

          <p>
            Join thousands of professionals and grow
            your business with LocalConnect.
          </p>

          <button className="join-btn">
            Join Now →
          </button>

        </div>

        <div className="cta-visual">

          <div className="provider-avatar">
            👨‍🔧
          </div>

          <div className="provider-rating">

            ⭐ 4.8

            <small>
              Top Rated Professional
            </small>

          </div>

        </div>

      </section>

      {/* ================= TRUST SECTION ================= */}

      <section className="trust-section">

        <div>

          <span>
            💳
          </span>

          <div>

            <strong>
              Secure Payments
            </strong>

            <p>
              100% secure payment
            </p>

          </div>

        </div>

        <div>

          <span>
            🛡️
          </span>

          <div>

            <strong>
              Verified Professionals
            </strong>

            <p>
              Trusted & verified
            </p>

          </div>

        </div>

        <div>

          <span>
            🕐
          </span>

          <div>

            <strong>
              24/7 Support
            </strong>

            <p>
              Always available
            </p>

          </div>

        </div>

        <div>

          <span>
            ✓
          </span>

          <div>

            <strong>
              On-time Service
            </strong>

            <p>
              Fast & reliable
            </p>

          </div>

        </div>

      </section>

      {/* ================= FOOTER ================= */}

      <footer className="footer">

        <div>

          <h3>
            ◇ LocalConnect
          </h3>

          <p>
            Your trusted local service marketplace.
          </p>

        </div>

        <div>

          <h4>
            Company
          </h4>

          <p>
            About Us
          </p>

          <p>
            Careers
          </p>

          <p>
            Contact
          </p>

        </div>

        <div>

          <h4>
            Services
          </h4>

          <p>
            For Customers
          </p>

          <p>
            For Providers
          </p>

          <p>
            How It Works
          </p>

        </div>

        <div>

          <h4>
            Support
          </h4>

          <p>
            Help Center
          </p>

          <p>
            Safety Center
          </p>

          <p>
            Privacy Policy
          </p>

        </div>

      </footer>

    </div>
  );
}

export default App;