const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const fs = require("fs");

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: !process.env.PHONE_NUMBER
  });

  sock.ev.on("creds.update", async () => {
    await saveCreds();

    if (fs.existsSync("./auth/creds.json")) {
      const data = fs.readFileSync("./auth/creds.json", "utf-8");
      const sessionText = Buffer.from(data).toString("base64");
      console.log("\n===== SESSION TEXT =====\n");
      console.log(sessionText);
      console.log("\n========================\n");
    }
  });

  // Phone Number Linking
  if (process.env.PHONE_NUMBER) {
    const code = await sock.requestPairingCode(
      process.env.PHONE_NUMBER.replace(/\D/g, "")
    );
    console.log("\nPAIRING CODE:", code, "\n");
  }
}

start();
