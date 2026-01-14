const express = require("express");
const path = require("path");
const cors = require("cors");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const app = express();

/* ===== MIDDLEWARE ===== */
app.use(cors());
app.use(express.json());

/* 🔴 VERY IMPORTANT: public folder */
app.use(express.static(path.join(__dirname, "public")));

/* ===== HOME ROUTE ===== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===== WHATSAPP ===== */
let sock;
let SESSION_TEXT = null;

async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ WhatsApp Connected");

      SESSION_TEXT = Buffer
        .from(JSON.stringify(state.creds))
        .toString("base64");

      console.log("✅ Session Ready");
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        startSocket();
      } else {
        console.log("❌ Logged Out");
      }
    }
  });
}

startSocket();

/* ===== PAIR API ===== */
app.post("/pair", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.json({ error: "Number required" });

    const code = await sock.requestPairingCode(number);
    res.json({ code });
  } catch (e) {
    res.json({ error: "Pairing failed" });
  }
});

/* ===== SESSION API ===== */
app.get("/session", (req, res) => {
  if (!SESSION_TEXT) {
    return res.json({ error: "Session not ready" });
  }
  res.json({ session: SESSION_TEXT });
});

/* ===== SERVER ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
