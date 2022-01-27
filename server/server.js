const express = require('express')
const bodyParser = require('body-parser');
const scraperController = require('./controllers/scraperController');
const mintController = require('./controllers/mintController');
const aiController = require('./controllers/aiController');
const userAuthController = require('./controllers/userAuthController');
const adminController = require('./controllers/adminController');
const axios = require('axios');
const mongoose = require('mongoose');
const path = require("path");
const db = mongoose.connection;
const dotenv = require('dotenv')
dotenv.config()

const app = express()
const port = 3000

mongoose.connect('mongodb+srv://admin:' + process.env.MONGODB_PASSWORD + '@main.dyjqy.mongodb.net/rudolphAioDB?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

db.once("open", async function() {
    console.log("Database Connected successfully");
});


app.use(express.static(path.join(__dirname, "..", "build")));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.all('*', function(req, res, next) {
    if (!req.get('Origin')) return next();

    res.set('Access-Control-Allow-Origin', 'self');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');

    if ('OPTIONS' == req.method) return res.send(200);

    next();
});


app.get('/api/', (req, res) => {
    res.send('Hello World!');
});

app.get('/', (req, res) => {
    res.send('Spooky, Scary Skeletons Shivering Down Your Spine!');
});

app.post('/api/askRudolph', (req, res) => {
    aiController.getAnswer(res, req);
});

app.post('/api/startFarming', (req, res) => {
    aiController.startFarming(res, req);
});

app.post('/api/stopFarming', (req, res) => {
    aiController.stopFarming(res, req);
});

app.post('/api/getFarmingData', (req, res) => {
    aiController.getFarmingData(res, req);
});

app.post('/api/updateBotSettings', (req, res) => {
    aiController.updateBotSettings(res, req);
});

app.post('/api/deleteBot', (req, res) => {
    aiController.deleteBot(res, req);
});

app.post('/api/mint', (req, res) => {
    scraperController.getScript(req.body.url, req.body.seed, res, req);
});

app.post('/api/getAdminData', (req, res) => {
    adminController.getAdminData(req, res);
});

// DISCORD API
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const redirect = process.env.SERVER_URI + '/dashboard';

app.post('/api/getDiscordAuthInfo', async(req, res) => {
    const code = req.body.code;
    const oauthResult = await axios({
        method: 'POST',
        url: 'https://discord.com/api/oauth2/token',
        data: new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirect,
            scope: 'identify',
        }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    }).catch((err) => res.send({ state: 'error', message: 'Error getting user info' }));

    const oauthData = await oauthResult.data;

    if (!oauthData) { res.send({ state: 'error', message: 'Error getting user info' }) } else {
        const userResult = await axios({
            url: 'https://discord.com/api/users/@me',
            method: 'GET',
            headers: {
                authorization: `${oauthData.token_type} ${oauthData.access_token}`,
            },
        }).catch((err) => res.send({ state: 'error', message: 'Error getting user info' }));

        const result = await userResult.data;

        if (result.code != 0) {
            res.send(result);
        } else {
            res.send({ state: 'error', message: 'Error getting user info' });
        }
    }
});

app.get('/api/discordLogin', (req, res) => {
    res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${redirect}`);
});

app.post('/api/checkAuthDiscord', (req, res) => {
    console.log(req.body);
    userAuthController.checkAuthDiscord(req, res);
});

app.post('/api/linkKeyDiscord', (req, res) => {
    userAuthController.linkKeyDiscord(res, req);
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, "..", "build", "index.html"));
});

app.get('/dashboard/*', (req, res) => {
    res.sendFile(path.join(__dirname, "..", "build", "index.html"));
});

process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
    console.error(err.stack);
});

app.listen(port, () => {
    console.log(`server listening at http://localhost:${port}`)
});