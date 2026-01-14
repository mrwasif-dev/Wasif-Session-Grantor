const express = require("express");
const cors = require("cors");
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let pairingInProgress = false;

async function startSock(){
  const { state, saveCreds } = await useMultiFileAuthState("session");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if(connection === "close"){
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startSock();
    }
    if(connection === "open"){
      console.log("✅ WhatsApp Connected");
    }
  });
}

startSock();

// 🔑 PAIR ENDPOINT
app.post("/pair", async (req,res)=>{
  try{
    if(pairingInProgress)
      return res.json({ error: "Pairing already running" });

    const number = req.body.number;
    if(!number) return res.json({ error:"Number required" });

    pairingInProgress = true;

    const code = await sock.requestPairingCode(number);
    pairingInProgress = false;

    res.json({ code });

  }catch(err){
    pairingInProgress = false;
    res.json({ error: "Failed to pair" });
  }
});

app.get("/", (req,res)=>{
  res.send("Wasif MD Session Generator Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
  console.log("🚀 Server running on port", PORT);
});
