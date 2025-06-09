const express = require('express');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const P = require('pino');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

const app = express();
const PORT = process.env.PORT || 3000;

let latestQR = null;

app.get('/', async (req, res) => {
  if (!latestQR) {
    return res.send('<h2>✅ Bot WhatsApp en ligne.<br>QR non encore généré...</h2>');
  }
  try {
    const qrImage = await qrcode.toDataURL(latestQR);
    res.send(`
      <h2>📱 Scanner ce QR Code avec WhatsApp</h2>
      <img src="${qrImage}" />
      <p>Actualisé automatiquement. Rafraîchissez la page si besoin.</p>
    `);
  } catch (err) {
    res.status(500).send('❌ Erreur lors du rendu du QR code');
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Serveur web lancé sur http://localhost:${PORT}`);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      latestQR = qr;
      // Affiche QR dans la console aussi
      qrcodeTerminal.generate(qr, { small: true });
      console.log('📲 QR Code généré, scannez-le avec WhatsApp');
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output?.statusCode
        : null;

      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnexion en cours...');
        startBot();
      } else {
        console.log('❌ Déconnecté (logout). Supprimez le dossier auth pour reconnecter.');
      }
    }

    if (connection === 'open') {
      console.log('✅ Bot connecté à WhatsApp');
      latestQR = null;
    }
  });

  // Ton code gestion des messages ici (exemple basique)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      console.log(`📩 Message reçu de ${from}`);

      // Réponse simple automatique
      await sock.sendMessage(from, { text: 'Bonjour, je suis votre bot WhatsApp!' });
    }
  });
}

startBot().catch(err => {
  console.error('❗ Erreur au démarrage du bot :', err);
});
