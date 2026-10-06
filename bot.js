const express = require('express');
const QRCode = require('qrcode');
const app = express();

let dernierQR = null;

app.get('/', (req, res) => res.send('Bot ON'));

app.get('/qr', async (req, res) => {
    if (!dernierQR) {
        return res.send('Pas de QR pour le moment (bot déjà connecté, ou en cours de démarrage). Recharge dans quelques secondes.');
    }
    const img = await QRCode.toDataURL(dernierQR, { width: 400 });
    res.send(`<html><body style="text-align:center;font-family:sans-serif">
        <h3>Scanne avec WhatsApp</h3>
        <img src="${img}" />
        <script>setTimeout(() => location.reload(), 15000)</script>
    </body></html>`);
});

app.listen(process.env.PORT || 10000);

const { Client, LocalAuth, Poll } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const schedule = require('node-schedule');

const GROUPE_ID = process.env.GROUPE_ID;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

const options = ["30 min - 7'30 /km","45 min - 7'30 /km","45 min - 7'00 /km","45 min - 6'30 /km","45 min - 6'00 /km","45 min - 5'30 /km","45 min - 5'00 /km","Manitou ⭐"];

// Évite de planifier les jobs en double si le client se reconnecte
let jobsPlanifies = false;

client.on('qr', qr => {
    dernierQR = qr;
    console.log('QR disponible sur /qr');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => console.log('Authentifié'));
client.on('auth_failure', msg => console.error('Échec authentification :', msg));
client.on('disconnected', reason => console.error('Déconnecté :', reason));

client.on('ready', async () => {
    dernierQR = null;
    console.log('Bot connecté !');

    if (!GROUPE_ID) {
        const chats = await client.getChats();
        chats.filter(c => c.isGroup).forEach(g => console.log(`${g.name} => ${g.id._serialized}`));
        return;
    }

    if (jobsPlanifies) return;
    jobsPlanifies = true;

    const envoyerSondage = async (titre) => {
        try {
            await client.sendMessage(GROUPE_ID, new Poll(titre, options));
            console.log(`Sondage envoyé : ${titre}`);
        } catch (err) {
            console.error('Erreur envoi sondage :', err);
        }
    };

    schedule.scheduleJob({ hour: 12, minute: 0, dayOfWeek: 1, tz: 'Europe/Paris' }, () =>
        envoyerSondage('RUN DU MARDI - Tu prends quel groupe ?')
    );
    schedule.scheduleJob({ hour: 12, minute: 0, dayOfWeek: 3, tz: 'Europe/Paris' }, () =>
        envoyerSondage('RUN DU JEUDI - Tu prends quel groupe ?')
    );
    console.log('Sondages planifiés (lundi et mercredi à 12h)');
});

// Empêche le process de mourir sur une erreur non gérée
process.on('unhandledRejection', err => console.error('unhandledRejection :', err));
process.on('uncaughtException', err => console.error('uncaughtException :', err));

// Anti-veille du plan gratuit Render : auto-ping toutes les 10 minutes
if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(() => {
        fetch(process.env.RENDER_EXTERNAL_URL).catch(() => {});
    }, 10 * 60 * 1000);
}

client.initialize().catch(err => console.error('Erreur initialisation :', err));
