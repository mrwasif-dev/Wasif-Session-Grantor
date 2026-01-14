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

/* ===== SETTINGS ===== */
const ADMIN_JID = "923039107958@s.whatsapp.net";
const CHANNEL_LINK = "https://whatsapp.com/channel/0029Vasn4ipCBtxCxfJqgV3S";

/* ==================== */

let sock;
let LAST_PAIR_NUMBER = null;

/* ---------- HOME ---------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ---------- START WHATSAPP ---------- */
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

    /* ✅ CONNECTED */
    if (connection === "open" && LAST_PAIR_NUMBER) {
      try {
        const sessionText = Buffer
          .from(JSON.stringify(state.creds))
          .toString("base64");

        const userJid = LAST_PAIR_NUMBER + "@s.whatsapp.net";

        /* ===== USER MESSAGES ===== */

        // Message 1
        await sock.sendMessage(userJid, {
          text: "*☺️ Thank To Choice Wasif MD ☺️*"
        });

        // Message 2 (SESSION ONLY)
        await sock.sendMessage(userJid, {
          text: sessionText
        });

        // Message 3 (WARNING)
        await sock.sendMessage(userJid, {
          text: "⚠️ Do not share this session with anyone"
        });

        /* ===== ADMIN NOTIFY ===== */
        await sock.sendMessage(ADMIN_JID, {
          text:
`✅ New Device Linked

📱 Number: ${LAST_PAIR_NUMBER}

📢 Channel:
${CHANNEL_LINK}`
        });

        console.log("✅ Session sent to user & admin notified");

        /* reset */
        LAST_PAIR_NUMBER = null;

      } catch (err) {
        console.log("❌ Error sending messages", err);
      }
    }

    /* ❌ DISCONNECTED */
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        startSocket();
      }
    }
  });
}

startSocket();

/* ---------- PAIR API ---------- */
app.post("/pair", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) {
      return res.json({ error: "Number required" });
    }

    LAST_PAIR_NUMBER = number; // 🔥 only temp, not stored

    const code = await sock.requestPairingCode(number);
    res.json({ code });

  } catch (err) {
    res.json({ error: "Pairing failed" });
  }
});

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Wasif MD Session Generator Running on", PORT);
});
