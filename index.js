const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

let sock;

async function init(phone) {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", async () => {
    await saveCreds();
  });

  if (phone) {
    const code = await sock.requestPairingCode(phone.replace(/\D/g, ""));
    return { pairingCode: code };
  }
}

app.post("/pair", async (req, res) => {
  const { phone } = req.body;
  const data = await init(phone);
  res.json(data);
});

app.get("/session", (req, res) => {
  if (!fs.existsSync("./auth/creds.json"))
    return res.json({ error: "Not linked yet" });

  const raw = fs.readFileSync("./auth/creds.json", "utf-8");
  const session = Buffer.from(raw).toString("base64");
  res.json({ session });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Web Session Generator Running"));
