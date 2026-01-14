const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");
const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static("public"));

let sock;

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);
}

startSock();

/* 👉 Pair with phone number */
app.post("/pair", async (req, res) => {
  try {
    const phone = req.body.phone;
    if (!phone) return res.json({ error: "Phone required" });

    // ⚠️ important delay
    setTimeout(async () => {
      const code = await sock.requestPairingCode(
        phone.replace(/\D/g, "")
      );
      res.json({ pairingCode: code });
    }, 2000);

  } catch (e) {
    res.json({ error: e.message });
  }
});

/* 👉 Get Session TEXT */
app.get("/session", (req, res) => {
  if (!fs.existsSync("./auth/creds.json"))
    return res.json({ error: "Not linked yet" });

  const raw = fs.readFileSync("./auth/creds.json", "utf-8");
  const session = Buffer.from(raw).toString("base64");
  res.json({ session });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("✅ Web Session Generator Running")
);
