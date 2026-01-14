const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Public folder (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// ✅ Pair API (abhi dummy – crash nahi karega)
app.post("/pair", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "Phone number required"
    });
  }

  // Test response (Baad mein WhatsApp logic add hoga)
  res.json({
    success: true,
    message: "Pair request received",
    code: "123-456"
  });
});

// ✅ Fallback (agar koi route miss ho)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Heroku PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Wasif MD Session Generator running on port", PORT);
});
