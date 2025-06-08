const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const express = require('express');
const generateStyledMultiplier = require('./predictor');

const app = express();
const PORT = process.env.PORT || 3000;

// Route de "ping" pour hébergement gratuit (Render, Railway)
app.get('/', (req, res) => {
  res.send('✅ Bot WhatsApp en ligne.');
});

app.listen(PORT, () => {
  console.log(`🌐 Serveur web lancé sur le port ${PORT}`);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({ auth: state });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : null) !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log('🔄 Reconnexion…');
        startBot();
      } else {
        console.log('❌ Déconnecté définitivement.');
      }
    } else if (connection === 'open') {
      console.log('✅ Bot connecté à WhatsApp');
    }
  });

  const lastMessageMap = new Map();
  const cooldownMap = new Map();

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      if (isOnCooldown(from)) return;

      const selectedId = msg.message?.buttonsResponseMessage?.selectedButtonId;
      if (selectedId === 'predict_next') {
        await envoyerNouvellePrediction(sock, from, lastMessageMap);
        continue;
      }

      await envoyerNouvellePrediction(sock, from, lastMessageMap);
    }
  });

  function isOnCooldown(user) {
    const now = Date.now();
    const last = cooldownMap.get(user) || 0;
    if (now - last < 10000) return true; // 10 sec
    cooldownMap.set(user, now);
    return false;
  }
}

async function envoyerNouvellePrediction(sock, from, lastMessageMap) {
  const prediction = generateStyledMultiplier();

  if (!prediction || !prediction.styled) {
    console.log('⚠️ Prédiction invalide.');
    return;
  }

  if (lastMessageMap.has(from)) {
    try {
      await sock.sendMessage(from, {
        delete: lastMessageMap.get(from)
      });
    } catch (e) {
      console.log('⚠️ Erreur suppression message précédent :', e.message);
    }
  }

  const sentMsg = await sock.sendMessage(from, {
    text: prediction.styled,
    footer: 'Cliquez sur le bouton ci-dessous pour une nouvelle prédiction',
    buttons: [
      {
        buttonId: 'predict_next',
        buttonText: { displayText: '🔁 Nouvelle prédiction' },
        type: 1
      }
    ],
    headerType: 1
  });

  lastMessageMap.set(from, {
    remoteJid: from,
    fromMe: true,
    id: sentMsg.key.id,
    participant: sentMsg.key.participant
  });

  console.log(`📩 Prédiction envoyée à ${from}`);
}

// Démarrage du bot
startBot().catch(err => {
  console.error('❗ Erreur au démarrage du bot :', err);
});
