const express = require('express');
const qrcode = require('qrcode');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const generateStyledMultiplier = require('./predictor');

const app = express();
const PORT = process.env.PORT || 3000;

let latestQR = null;

// Interface Web pour afficher le QR
app.get('/', async (req, res) => {
  if (!latestQR) {
    return res.send('<h2>✅ Bot WhatsApp en ligne.<br>QR non encore généré...</h2>');
  }

  try {
    const qrImage = await qrcode.toDataURL(latestQR);
    res.send(`
      <h2>📱 Scanner ce QR Code avec WhatsApp</h2>
      <img src="${qrImage}" />
      <p>Code mis à jour automatiquement.</p>
    `);
  } catch (err) {
    res.status(500).send('❌ Erreur lors du rendu du QR code');
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Serveur web lancé sur http://localhost:${PORT}`);
});

// === Lancement du bot ===
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const sock = makeWASocket({ auth: state });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      latestQR = qr; // Stocker pour affichage navigateur
      console.log('📲 QR Code généré');
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : null) !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log('🔄 Reconnexion...');
        startBot();
      } else {
        console.log('❌ Déconnecté définitivement.');
      }
    } else if (connection === 'open') {
      console.log('✅ Bot connecté à WhatsApp');
      latestQR = null; // QR plus nécessaire
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
    if (now - last < 10000) return true; // 10 sec cooldown
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
      console.log('⚠️ Erreur lors de la suppression :', e.message);
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

startBot().catch(err => {
  console.error('❗ Erreur au démarrage du bot :', err);
});
