const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Home route (HTML serve کرے گا بعد میں)
app.get("/", (req, res) => {
  res.send("Wasif MD Session Generator is running ✅");
});

// ✅ Pair route (abhi dummy – crash nahi karega)
app.post("/pair", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number required" });
  }

  // abhi sirf test response
  res.json({
    success: true,
    message: "Pair request received",
    code: "123-456"
  });
});

// ✅ Heroku PORT fix
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
