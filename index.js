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
let pairingCode = null;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      if (
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut
      ) {
        startSocket();
      }
    }

    if (connection === "open") {
      console.log("✅ WhatsApp Connected");
    }
  });
}

startSocket();

/* ===== PAIR API ===== */
app.post("/pair", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.json({ error: "Number required" });

    pairingCode = await sock.requestPairingCode(number);
    res.json({ code: pairingCode });
  } catch (e) {
    res.json({ error: "Pairing failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Wasif MD Session Generator Running");
});
