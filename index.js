const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const generateStyledMultiplier = require('./predictor'); // Fonction de prédiction personnalisée

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    auth: state,
    // Affichage QR dans le terminal (local uniquement)
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('📲 QR Code généré, scannez-le avec WhatsApp');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('✅ Bot connecté à WhatsApp');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output?.statusCode
        : null;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log('🔄 Reconnexion en cours...');
        startBot();
      } else {
        console.log('❌ Déconnecté définitivement. Supprimez le dossier auth_info pour reconnecter.');
      }
    }
  });

  // Garde mémoire des derniers messages pour les supprimer avant de renvoyer
  const lastMessageMap = new Map();

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;

      const selectedId = msg.message?.buttonsResponseMessage?.selectedButtonId;

      if (selectedId === 'predict_next') {
        await envoyerNouvellePrediction(sock, from, lastMessageMap);
        continue;
      }

      await envoyerNouvellePrediction(sock, from, lastMessageMap);
    }
  });
}

async function envoyerNouvellePrediction(sock, from, lastMessageMap) {
  const prediction = generateStyledMultiplier();

  if (!prediction || !prediction.styled) {
    console.log('⚠️ Prédiction invalide.');
    return;
  }

  // Supprime le message précédent
  if (lastMessageMap.has(from)) {
    try {
      await sock.sendMessage(from, {
        delete: lastMessageMap.get(from)
      });
    } catch (e) {
      console.log('⚠️ Erreur suppression message précédent :', e.message);
    }
  }

  // Envoie le nouveau message avec bouton
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

  // Sauvegarde pour suppression future
  lastMessageMap.set(from, {
    remoteJid: from,
    fromMe: true,
    id: sentMsg.key.id,
    participant: sentMsg.key.participant
  });
}

startBot().catch(err => {
  console.error('❗ Erreur au démarrage du bot :', err);
});
