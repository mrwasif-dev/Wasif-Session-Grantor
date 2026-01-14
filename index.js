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

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ---------- GLOBAL ---------- */
let sock;
let SESSION_TEXT = null;

/* ---------- HOME (HTML OPEN) ---------- */
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
    if (connection === "open") {
      console.log("✅ WhatsApp Connected");

      SESSION_TEXT = Buffer
        .from(JSON.stringify(state.creds))
        .toString("base64");

      console.log("✅ Session Generated");

      /* SEND SESSION ON WHATSAPP (3 MESSAGES) */
      try {
        const jid =
          sock.user.id.split(":")[0] + "@s.whatsapp.net";

        // MESSAGE 1
        await sock.sendMessage(jid, {
          text: "☺️Thank To Choice  Wasif MD☺️"
        });

        // MESSAGE 2 (SESSION ONLY)
        await sock.sendMessage(jid, {
          text: SESSION_TEXT
        });

        // MESSAGE 3 (WARNING)
        await sock.sendMessage(jid, {
          text: "⚠️ Do not share this session with anyone"
        });

        console.log("📨 Session sent on WhatsApp");
      } catch (e) {
        console.log("❌ WhatsApp send failed");
      }
    }

    /* ❌ DISCONNECTED */
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

/* ---------- PAIR API ---------- */
app.post("/pair", async (req, res) => {
  try {
    if (!sock) return res.json({ error: "Socket not ready" });

    const { number } = req.body;
    if (!number) return res.json({ error: "Number required" });

    const code = await sock.requestPairingCode(number);
    res.json({ code });

  } catch (err) {
    console.log(err);
    res.json({ error: "Pairing failed" });
  }
});

/* ---------- SESSION API (HTML USE) ---------- */
app.get("/session", (req, res) => {
  if (!SESSION_TEXT) {
    return res.json({ ready: false });
  }
  res.json({ ready: true, session: SESSION_TEXT });
});

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Wasif MD Session Generator Running on", PORT);
});
