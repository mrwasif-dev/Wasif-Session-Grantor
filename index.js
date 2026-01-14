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

let sock;
let latestQR = null;
let status = "Idle";

async function startSock() {
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
}
startSock();

/* QR */
app.get("/qr", (req, res) => {
  if (!latestQR) return res.json({ error: "QR not ready" });
  res.json({ qr: latestQR });
});

/* Phone pairing */
app.post("/pair", async (req, res) => {
  const phone = req.body.phone;
  if (!phone) return res.json({ error: "Phone required" });

  setTimeout(async () => {
    const code = await sock.requestPairingCode(phone.replace(/\D/g, ""));
    res.json({ code });
  }, 2000);
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
app.listen(PORT, () => console.log("✅ App Running"));
