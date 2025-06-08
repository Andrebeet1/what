const axios = require("axios");
require("dotenv").config();

const webhookURL = process.env.WEBHOOK_URL;

async function sendToWebhook(payload) {
  if (!webhookURL) {
    console.log("❌ WEBHOOK_URL non défini dans le fichier .env");
    return;
  }

  try {
    await axios.post(webhookURL, payload);
    console.log("📡 Données envoyées au webhook :", payload);
  } catch (err) {
    console.error("❌ Échec envoi webhook :", err.message);
  }
}

sendToWebhook({ content: "Hello depuis le client webhook 🚀" });
