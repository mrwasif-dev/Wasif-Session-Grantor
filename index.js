const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");
const express = require("express");
const fs = require("fs");
const QRCode = require("qrcode");

const app = express();
app.use(express.json());
app.use(express.static("public"));

let sock = null;
let latestQR = null;
let status = "Idle";
let initializing = false;

async function initSock() {
  if (sock || initializing) return;
  initializing = true;

  const { state, saveCreds } = await useMultiFileAuthState("auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    if (u.qr) {
      latestQR = await QRCode.toDataURL(u.qr);
    }
    if (u.connection === "open") {
      status = "Logged In";
    }
  });

  initializing = false;
}

/* ensure socket before any action */
app.use(async (req, res, next) => {
  try {
    await initSock();
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* QR */
app.get("/qr", (req, res) => {
  if (!latestQR) return res.json({ error: "QR not ready" });
  res.json({ qr: latestQR });
});

/* Phone Pairing */
app.post("/pair", async (req, res) => {
  try {
    const phone = req.body.phone;
    if (!phone) return res.json({ error: "Phone required" });

    const code = await sock.requestPairingCode(
      phone.replace(/\D/g, "")
    );
    res.json({ code });

  } catch (e) {
    res.json({ error: e.message });
  }
});

/* Status */
app.get("/status", (req, res) => {
  res.json({ status });
});

/* Session */
app.get("/session", (req, res) => {
  if (!fs.existsSync("./auth/creds.json"))
    return res.json({ error: "Not logged in" });

  const raw = fs.readFileSync("./auth/creds.json", "utf-8");
  const session = Buffer.from(raw).toString("base64");
  res.json({ session });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("✅ Web Session Generator Running")
);
