const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

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

    // ✅ CONNECTED (DEVICE LINKED)
    if (connection === "open") {
      console.log("✅ WhatsApp Connected");

      // 🔐 SESSION TEXT
      SESSION_TEXT = Buffer
        .from(JSON.stringify(state.creds))
        .toString("base64");

      // Save for HTML
      fs.writeFileSync("session.txt", SESSION_TEXT);

      // 📩 SEND 3 SEPARATE MESSAGES ON WHATSAPP
      try {
        const myNumber =
          sock.user.id.split(":")[0] + "@s.whatsapp.net";

        // MESSAGE 1
        await sock.sendMessage(myNumber, {
          text: "*☺️ Thank To Choice Wasif MD ☺️*"
        });

        // MESSAGE 2 (ONLY SESSION)
        await sock.sendMessage(myNumber, {
          text: SESSION_TEXT
        });

        // MESSAGE 3 (WARNING)
        await sock.sendMessage(myNumber, {
          text:
"⚠️ WARNING:\n\n" +
"Do not share this Session ID with anyone.\n" +
"If leaked, your WhatsApp can be hacked."
        });

        console.log("📨 Session messages sent");
      } catch (e) {
        console.log("❌ WhatsApp message failed");
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

// ---------- SESSION API (FOR HTML) ----------
app.get("/session", (req, res) => {
  if (fs.existsSync("session.txt")) {
    return res.json({
      session: fs.readFileSync("session.txt", "utf-8")
    });
  }
  res.json({ error: "Session not ready" });
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Wasif MD Session Generator Running on", PORT);
});
