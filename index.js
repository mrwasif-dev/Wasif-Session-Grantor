const express = require("express");
const cors = require("cors");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let sock;
let SESSION_TEXT = null;

// ---------- HOME ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- START WHATSAPP ----------
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

    // ✅ CONNECTED
    if (connection === "open") {
      console.log("✅ WhatsApp Connected");

      // 🔐 SESSION TEXT (BASE64)
      SESSION_TEXT = Buffer
        .from(JSON.stringify(state.creds))
        .toString("base64");

      console.log("✅ Session Text Generated");

      // 📩 SEND SESSION TO SAME NUMBER
      try {
        const myNumber =
          sock.user.id.split(":")[0] + "@s.whatsapp.net";

        await sock.sendMessage(myNumber, {
          text:
`✅ DEVICE LINKED SUCCESSFULLY

🔐 SESSION ID (TEXT):
${SESSION_TEXT}

⚠️ Do not share this with anyone`
        });

        console.log("📨 Session sent on WhatsApp");
      } catch (e) {
        console.log("❌ Failed to send session on WhatsApp");
      }
    }

    // ❌ DISCONNECTED
    if (connection === "close") {
      const reason =
        lastDisconnect?.error?.output?.statusCode;

      if (reason !== DisconnectReason.loggedOut) {
        startSocket();
      } else {
        console.log("❌ Logged Out");
      }
    }
  });
}

startSocket();

// ---------- PAIR API ----------
app.post("/pair", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) {
      return res.json({ error: "Number required" });
    }

    const code = await sock.requestPairingCode(number);
    res.json({ code });

  } catch (err) {
    res.json({ error: "Pairing failed" });
  }
});

// ---------- SESSION API (OPTIONAL) ----------
app.get("/session", (req, res) => {
  if (!SESSION_TEXT) {
    return res.json({ error: "Session not ready" });
  }
  res.json({ session: SESSION_TEXT });
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Wasif MD Session Generator Running on", PORT);
});
