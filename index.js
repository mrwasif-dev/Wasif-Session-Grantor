import express from "express"
import cors from "cors"
import makeWASocket, {
  useMultiFileAuthState
} from "@whiskeysockets/baileys"
import pino from "pino"

const app = express()
app.use(cors())
app.use(express.json())

let sock
let sessionId = null

async function startWA () {
  const { state, saveCreds } =
    await useMultiFileAuthState("session")

  sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    if (update.connection === "open") {
      sessionId = Buffer
        .from(JSON.stringify(state.creds))
        .toString("base64")
      console.log("✅ WhatsApp Connected")
    }
  })
}
startWA()

// 🔗 Pair Request
app.post("/pair", async (req, res) => {
  try {
    let { number } = req.body
    number = number.replace(/\D/g, "")

    const code = await sock.requestPairingCode(number)

    res.json({
      code: code.match(/.{1,4}/g).join("-")
    })
  } catch (e) {
    res.json({ error: "Pairing failed" })
  }
})

// 📦 Session
app.get("/session", (req, res) => {
  if (!sessionId)
    return res.json({ error: "Not ready" })

  res.json({ session: sessionId })
})

app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 Server Started")
)
