const express = require('express');
const app = express();
app.get('/', (req,res) => res.send('Bot ON'));
app.listen(process.env.PORT || 10000);

const { Client, LocalAuth, Poll } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const schedule = require('node-schedule');

const GROUPE_ID = process.env.GROUPE_ID;
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

const options = ["30 min - 7'30 /km","45 min - 7'30 /km","45 min - 7'00 /km","45 min - 6'30 /km","45 min - 6'00 /km","45 min - 5'30 /km","45 min - 5'00 /km","Manitou ⭐"];

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', async () => {
    console.log('Bot connecté !');
    if (!GROUPE_ID) {
        const chats = await client.getChats();
        chats.filter(c => c.isGroup).forEach(g => console.log(`${g.name} => ${g.id._serialized}`));
        return;
    }
    schedule.scheduleJob({ hour: 12, minute: 0, dayOfWeek: 1, tz: 'Europe/Paris' }, async () => {
        await client.sendMessage(GROUPE_ID, new Poll('RUN DU MARDI - Tu prends quel groupe ?', options));
    });
    schedule.scheduleJob({ hour: 12, minute: 0, dayOfWeek: 3, tz: 'Europe/Paris' }, async () => {
        await client.sendMessage(GROUPE_ID, new Poll('RUN DU JEUDI - Tu prends quel groupe ?', options));
    });
});
client.initialize();
