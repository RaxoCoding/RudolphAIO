var axios = require('axios');
const Discord = require('discord.js-selfbot');
const levelFarms = require('../models/levelFarmModel');
const dashboardKeys = require('../models/dashboardKeysModel');
var randomSpam = require('./spam.json');
require('dotenv').config();
var fs = require('fs');
let chatLogs = '';
var mention_pattern = /<[#-@].?[0-9]*?>/g;
var emoji_pattern = /(<a?)?:\w+:(\d{18}>)?/g;
const emoji_check = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/gi;
var Filter = require('bad-words'),
    filter = new Filter();
const { encrypt, decrypt } = require('./encryptionController');
const { Webhook } = require('discord-webhook-node');
const giveawayBots = ['294882584201003009', '530082442967646230'];
const serverData = require('../server.js');

let needsShutdown = [];

// Open AI
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

fs.readFile('./prompt.txt', 'utf8', function(err, data) {
    chatLogs = data;
});

function isUpperCase(str) {
    return str === str.toUpperCase();
}


exports.shutdownBots = async function() {
    const runningBots = await levelFarms.find({ state: 1 });

    runningBots.forEach(function(bot) {
        try {
            let hook = undefined;
            if (bot.webhook != 'none' || bot.webhook.trim().length > 0) {
                hook = new Webhook(bot.webhook);
                hook.setUsername('Rudolph Alerts');
            }
            if (hook) hook.send(`⚠️ Server has been restarted @ ${new Date()}`);
        } catch (e) {
            console.log(e.message);
        }
    });

    await levelFarms.updateMany({ state: 0 });
    console.log('shutdown all bots');
}


async function secretInlinReply(bot, msg, text) {
    axios.post(`https://discord.com/api/v9/channels/${msg.channel.id}/messages`, {
        "content": text,
        "nonce": Math.floor(Math.random() * 1000000000000000000).toString(),
        "tts": false,
        "message_reference": {
            "guild_id": msg.guild.id,
            "channel_id": msg.channel.id,
            "message_id": msg.id
        },
        "allowed_mentions": {
            "parse": [
                "users",
                "roles",
                "everyone"
            ],
            "replied_user": true
        }
    }, {
        headers: {
            'authorization': bot.botToken.iv ? decrypt(bot.botToken) : bot.botToken,
        }
    });
}

exports.getAnswer = async function(res, req) {
    let tempChatLogs = req.body.chatLogs;
    tempChatLogs += `Human: ${req.body.text.trim().replace(mention_pattern, '').replace(emoji_pattern, '').replace(/(?:https?|ftp):\/\/[\n\S]+/g, 'link')}\nAI:`;

    let mathString = req.body.text.replace(mention_pattern, '').replace(emoji_pattern, '').replace(/(?:https?|ftp):\/\/[\n\S]+/g, 'link').replace(/\s/g, '');

    var total = 0;
    mathArray = mathString.match(/[+\-]*(\.\d+|\d+(\.\d+)?)/g) || [];

    if (req.body.text.replace(mention_pattern, '').replace(emoji_pattern, '').replace(/(?:https?|ftp):\/\/[\n\S]+/g, '').replace(/\s/g, '') == '') {
        res.send({ answer: undefined });
    } else if (mathArray.length > 1) {
        while (mathArray.length) {
            total += parseFloat(mathArray.shift());
        }

        tempChatLogs += `AI: ${total}\n`;

        res.send({ answer: total, chatLogs: tempChatLogs });
    } else {
        const response = await openai.createCompletion("text-babbage-001", {
            prompt: tempChatLogs,
            temperature: 0.9,
            max_tokens: 50,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0.6,
            stop: [" Human:", " AI:"],
        }).catch(err => {
            serverData.Sentry.captureException(err);
        });
        try {
            if (response.data.choices[0].text[response.data.choices[0].text.length - 1] === ".")
                response.data.choices[0].text = response.data.choices[0].text.slice(0, -1);

            if (response.data.choices[0].text.split('Human:')[1])
                response.data.choices[0].text = response.data.choices[0].text.split('Human:')[0];
            if (response.data.choices[0].text.split('AI:')[1])
                response.data.choices[0].text = response.data.choices[0].text.split('AI:')[0];

            response.data.choices[0].text = response.data.choices[0].text.replace(/\n|\r/g, "").replace(/(?:https?|ftp):\/\/[\n\S]+/g, 'link').replace(mention_pattern, '').replace(emoji_pattern, '')

            let answer = '';

            if (emoji_check.test(response.data.choices[0].text)) {
                answer = response.data.choices[0].text;
            } else if (!(isNaN(response.data.choices[0].text))) {
                throw ('answer was just a number');
            } else {
                answer = filter.clean(response.data.choices[0].text);
            }

            tempChatLogs += `${response.data.choices[0].text.replace(/\n|\r/g, "").replace(/(?:https?|ftp):\/\/[\n\S]+/g, 'link').replace(mention_pattern, '').replace(emoji_pattern, '')}\n`;

            if (isUpperCase(answer)) {
                answer = answer.toLowerCase();
            }

            res.send({ answer: answer, chatLogs: tempChatLogs });
        } catch (e) {
            console.log(tempChatLogs, e.message, response.data);
            serverData.Sentry.captureException(e);
            res.send({ answer: undefined });
        }
    }
}

exports.stopFarming = async function(res, req) {

    const data = await levelFarms.findOne({ discordId: req.body.userToken, state: 1 });

    if (data) {
        await levelFarms.updateOne(data, { state: 0 });

        needsShutdown.push(data.botName);

        res.send({ state: 'success', message: 'Successfully stopped bot' });
    } else {
        res.send({ state: 'error', message: 'You have no bots currently farming' });
    }

}

// State changes to 2 on its own!
exports.startFarming = async function(res, req) {

    try {
        req.body.token = await encrypt(req.body.token);
    } catch (err) {
        serverData.Sentry.captureException(err);
    }

    let checkIfFarming = await levelFarms.findOne({ discordId: req.body.userToken, state: { $in: [1, 2] } });

    let checkIfFarmingState;

    if (checkIfFarming) {
        checkIfFarmingState = checkIfFarming.state;
    } else {
        checkIfFarmingState = 0;
    }

    if (checkIfFarmingState == 1) {
        res.send({ state: 'error', message: 'Already farming' });
    } else if (checkIfFarmingState == 2) {
        res.send({ state: 'error', message: 'Wait for last bot to fully shutdown...' });
    } else {
        let channelId = req.body.channelId;

        function sleep(ms) {
            return new Promise((resolve) => {
                setTimeout(resolve, ms);
            });
        }

        function isEmoji(str) {
            var ranges = [
                '(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])' // U+1F680 to U+1F6FF
            ];
            if (str.match(ranges.join('|'))) {
                return true;
            } else {
                return false;
            }
        }

        require("./customLibraries/extendedMessage");

        const client = new Discord.Client({
            allowedMentions: {
                // set repliedUser value to `false` to turn off the mention by default
                repliedUser: true
            }
        });

        client.on("error", (err) => {
            console.log(err, err.message, 'DISCORD ERROR');
            serverData.Sentry.captureException(err);
        })
        client.on('shardError', error => {
            console.log('DISCORD ERROR: A websocket connection encountered an error:', error.message);
            serverData.Sentry.captureException(error);
        });
        process.on('unhandledRejection', error => {
            console.log('DISCORD ERROR: Unhandled promise rejection:', error);
            serverData.Sentry.captureException(error);
        });

        client.on('shardDisconnect', async() => {
            currentlyShuttingDown = true;
            console.log('Shutting bot down...', client.user.tag);

            try {

                const checkArraylength = await dashboardKeys.findOne({ discordId: req.body.userToken });
                if (checkArraylength.chatLogs.length >= 20) {
                    checkArraylength.chatLogs.shift();
                }

                checkArraylength.chatLogs.push(`Stopped Bot ${client.user.tag} @ ${new Date()} 'timer reached 15 minutes of inactivity'`);
                await dashboardKeys.updateOne({ discordId: req.body.userToken }, { $set: { chatLogs: checkArraylength.chatLogs } });

                await levelFarms.updateOne({ discordId: req.body.userToken, botName: client.user.tag }, { state: 0 });
            } catch (e) {
                console.log(e, 'shardDisconnect');
            }
            await client.destroy();
        });

        client.on('ready', async() => {
            console.log(`Logged in as ${client.user.tag}!`);
            let checkIfBotExists = await levelFarms.findOne({ discordId: req.body.userToken, botName: client.user.tag });

            let avatar = 'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png'
            if (client.user.avatarURL() != null) {
                avatar = client.user.avatarURL();
            }

            if (!checkIfBotExists) {
                const newBot = await levelFarms.create({
                    discordId: req.body.userToken,
                    channelId: req.body.channelId,
                    messageDelay: req.body.messageDelay,
                    start_date: new Date(),
                    endTimer: req.body.endTimer,
                    messages: [],
                    botName: client.user.tag,
                    botAvatar: avatar,
                    botToken: req.body.token,
                    mintDate: req.body.mintDate,
                    collectionName: req.body.collectionName,
                    state: 1,
                    customPrompt: req.body.customPrompt,
                    spam: req.body.spam,
                    delete: req.body.delete,
                    instantDelete: req.body.instantDelete,
                    webhook: req.body.webhook,
                });
                checkIfBotExists = newBot;
            } else {
                await levelFarms.updateOne(checkIfBotExists, { start_date: new Date(), endTimer: checkIfBotExists.endTimer, state: 1, botName: client.user.tag, botAvatar: client.user.avatarURL() == null ? 'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png' : client.user.avatarURL() });

                checkIfBotExists.start_date = new Date();
                checkIfBotExists.endTimer = checkIfBotExists.endTimer;
                checkIfBotExists.state = 1;
                checkIfBotExists.botName = client.user.tag;
                checkIfBotExists.botAvatar = avatar;
            }

            let hook = undefined;
            if (checkIfBotExists.webhook != 'none' || checkIfBotExists.webhook.trim().length > 0) {
                hook = new Webhook(checkIfBotExists.webhook);
                hook.setUsername('Rudolph Alerts');
                hook.setAvatar(avatar);
            }

            let channelExists = undefined;

            try {
                channelExists = await client.channels.cache.get(checkIfBotExists.channelId);
            } catch (err) {
                console.log(err.message);
            }


            if (channelExists) {
                const checkArraylength = await dashboardKeys.findOne({ discordId: req.body.userToken });
                if (checkArraylength.chatLogs.length >= 20) {
                    checkArraylength.chatLogs.shift();
                }

                try {
                    if (hook) hook.send(`✅ Started Bot **${client.user.tag}** @ ${new Date()}`);
                } catch (e) {
                    console.log(e.message, 'hook');
                }

                checkArraylength.chatLogs.push(`Started Bot ${client.user.tag} @ ${new Date()}`);

                console.log(`Started Bot `, client.user.tag);

                await dashboardKeys.updateOne({ discordId: req.body.userToken }, { $set: { chatLogs: checkArraylength.chatLogs } });

                res.send({ state: 'success', message: 'Started Farming' });
            } else {
                console.log('Shutting bot down...', client.user.tag);
                res.send({ state: 'error', message: 'No Access to Channel!' });

                await levelFarms.updateOne({ discordId: req.body.userToken, botName: client.user.tag }, { state: 0 });
                await client.destroy();
                return;
            }

            // Set the date we're counting down to
            let minutesToAdd = req.body.messageDelay;
            let currentDate = new Date();

            let countDownDate = new Date(currentDate.getTime() + (minutesToAdd * 60000)).getTime();
            let countDownDistance = 1;
            let currentlyShuttingDown = false;

            let currentlyChecking = false;
            let channelIdToCheck = req.body.channelId;

            let botChatLogs = chatLogs.replace('{botName}', client.user.tag.split('#')[0]).replace('{botName}', client.user.tag.split('#')[0]).replace('{botName}', client.user.tag.split('#')[0]).replace('{collectionName}', req.body.collectionName).replace('{mintDate}', req.body.mintDate).replace('{customPrompt}', (req.body.customPrompt + ' \n\nHuman: Hey!\nAI: Hello!\n'));

            let messagesThatNeedReply = [];

            let lastResponder = '';
            let totalMessagesWithLastResponder = 0;

            let lastResponse = '';
            let lastMessage = '';

            let messagesSinceTimer = 0;

            let mainGuild = undefined;
            let discordId = req.body.userToken;

            // Update the count down every 1 second
            var x = setInterval(function() {
                // Get today's date and time
                var now = new Date().getTime();
                // Find the distance between now and the count down date
                countDownDistance = countDownDate - now;

                console.log(countDownDistance, client.user.tag)

                if (needsShutdown.filter(item => item === client.user.tag)[0] != undefined) {
                    (async function() {
                        currentlyShuttingDown = true;
                        console.log('Shutting bot down...', client.user.tag);

                        const checkArraylength = await dashboardKeys.findOne({ discordId: discordId });
                        if (checkArraylength.chatLogs.length >= 20) {
                            checkArraylength.chatLogs.shift();
                        }

                        try {
                            if (hook) hook.send(`⛔ Stopped Bot **${client.user.tag}** @ ${new Date()} 'user input'`);
                        } catch (e) {
                            console.log(e.message, 'hook');
                        }
                        checkArraylength.chatLogs.push(`Stopped Bot ${client.user.tag} @ ${new Date()} 'user input'`);
                        dashboardKeys.updateOne({ discordId: discordId }, { $set: { chatLogs: checkArraylength.chatLogs } });

                        levelFarms.updateOne({ discordId: discordId, botName: client.user.tag }, { state: 0 });

                        needsShutdown = needsShutdown.filter(function(obj) {
                            return obj !== client.user.tag;
                        });

                        await client.destroy();
                        return;
                    })()
                }

                if ((checkIfBotExists.spam && checkIfBotExists.instantDelete || checkIfBotExists.spam && checkIfBotExists.delete) && countDownDistance < 0 && !currentlyChecking) {
                    currentlyChecking = true;
                    try {
                        answer = randomSpam.spam[Math.floor(Math.random() * randomSpam.spam.length)];

                        while (answer == lastResponse) {
                            answer = randomSpam.spam[Math.floor(Math.random() * randomSpam.spam.length)];
                        }

                        let answerTrimmed;
                        if (answer != undefined) {
                            answerTrimmed = answer.toString().replace(/' '/g, '');
                        } else {
                            answerTrimmed = '';
                        }

                        if (answer == undefined || answerTrimmed.length <= 0) {
                            currentlyChecking = false;
                            return;
                        } else {
                            if (checkIfBotExists.delete && lastMessage.length > 0 && !checkIfBotExists.instantDelete) {
                                lastMessage.delete();
                            }
                            channelExists.startTyping();
                            sleep((answer.length * (Math.floor(Math.random() * (30 - 10 + 1)) + 10)));
                            channelExists.send(`${answer}`).then(msg => {
                                lastMessage = msg;
                                if (checkIfBotExists.instantDelete) {
                                    msg.delete();
                                }
                            }).catch(error => {
                                serverData.Sentry.captureException(error);
                                console.log(error, 2, answer);
                            });
                            channelExists.stopTyping();
                        }

                        let data = checkIfBotExists.messages;
                        data.push({ messageAuthor: 'None', message: 'none', response: answer, timeStamp: new Date() });
                        if (data.length > 20) {
                            data.shift();
                        }

                        levelFarms.findOneAndUpdate({ discordId: discordId, botName: client.user.tag }, { messages: data });

                        minutesToAdd = checkIfBotExists.messageDelay;
                        currentDate = new Date();
                        countDownDate = new Date(currentDate.getTime() + (minutesToAdd * 60000)).getTime();
                        setTimeout(() => { currentlyChecking = false }, 1000);
                        lastResponse = answer;
                    } catch (err) {
                        currentlyChecking = false;
                        serverData.Sentry.captureException(err);
                        console.log(err);
                    }
                }
            }, 1000);

            client.on("message", async function(message) {
                try {
                    if (!currentlyShuttingDown) {
                        if (countDownDistance <= -900000) {
                            currentlyShuttingDown = true;
                            console.log('Shutting bot down...', client.user.tag);
                            clearInterval(x);
                            try {

                                const checkArraylength = await dashboardKeys.findOne({ discordId: discordId });
                                if (checkArraylength.chatLogs.length >= 20) {
                                    checkArraylength.chatLogs.shift();
                                }
                                try {
                                    if (hook) hook.send(`⛔ Stopped Bot **${client.user.tag}** @ ${new Date()} 'timer reached 15 minutes of inactivity'`);
                                } catch (e) {
                                    console.log(e.message, 'hook');
                                }
                                checkArraylength.chatLogs.push(`Stopped Bot ${client.user.tag} @ ${new Date()} 'timer reached 15 minutes of inactivity'`);
                                await dashboardKeys.updateOne({ discordId: discordId }, { $set: { chatLogs: checkArraylength.chatLogs } });

                                await levelFarms.updateOne({ discordId: discordId, botName: client.user.tag }, { state: 0 });
                            } catch (e) {
                                console.log(e, 'timer 15 min');
                            }
                            await client.destroy();
                            return;
                        }

                        if (message.channel.name && message.author) {
                            if (giveawayBots.includes(message.author.id) && message.channel.name.includes('giveaway')) {
                                if (message.mentions.users.get(client.user.id)) {
                                    try {
                                        if (hook) hook.send(`🎉 Giveaway Win! **${client.user.tag}** @ ${message.guild.name}`);
                                    } catch (e) {
                                        console.log(e.message, 'hook giveaway');
                                    }
                                } else {
                                    message.react("🎉");
                                }
                                return;
                            }
                        }

                        if (message.author.bot) return;
                        if (message.channel.id != channelIdToCheck) return;

                        let checkIfBotNeedsShutdown = await levelFarms.findOne({ discordId: discordId, state: 1 });

                        channelExists = false;

                        if (checkIfBotNeedsShutdown) {
                            try {
                                channelExists = await client.channels.cache.get(checkIfBotNeedsShutdown.channelId);
                            } catch (e) {
                                console.log(e);
                            }
                        }

                        if ((!checkIfBotNeedsShutdown || !channelExists) && !currentlyShuttingDown) {
                            currentlyShuttingDown = true;
                            console.log('Shutting bot down...', client.user.tag);
                            clearInterval(x);
                            try {

                                const checkArraylength = await dashboardKeys.findOne({ discordId: discordId });
                                if (checkArraylength.chatLogs.length >= 20) {
                                    checkArraylength.chatLogs.shift();
                                }
                                try {
                                    if (hook) hook.send(`⛔ Stopped Bot **${client.user.tag}** @ ${new Date()} 'bot was stopped or lost channel access'`);
                                } catch (e) {
                                    console.log(e.message, 'hook');
                                }
                                checkArraylength.chatLogs.push(`Stopped Bot ${client.user.tag} @ ${new Date()} 'bot was stopped or lost channel access'`);
                                await dashboardKeys.updateOne({ discordId: discordId }, { $set: { chatLogs: checkArraylength.chatLogs } });

                                await levelFarms.updateOne({ discordId: discordId, botName: client.user.tag }, { state: 0 });
                            } catch (e) {
                                serverData.Sentry.captureException(e);
                                console.log(e, 69);
                            }
                            await client.destroy();
                            return;
                        } else {
                            try {
                                mainGuild = await client.channels.cache.get(checkIfBotNeedsShutdown.channelId).guild;
                            } catch (e) {
                                console.log(e);
                            }
                        }

                        const currentDateForTimer = new Date();
                        const minutes = parseInt(Math.abs(currentDateForTimer.getTime() - checkIfBotNeedsShutdown.start_date.getTime()) / (1000 * 60));

                        if ((minutes >= checkIfBotNeedsShutdown.endTimer) && !currentlyShuttingDown) {
                            currentlyShuttingDown = true;
                            console.log(checkIfBotNeedsShutdown.start_date, currentDateForTimer, minutes, checkIfBotNeedsShutdown.endTimer);
                            console.log('Shutting bot down...', client.user.tag);
                            clearInterval(x);

                            const checkArraylength = await dashboardKeys.findOne({ discordId: discordId });
                            if (checkArraylength.chatLogs.length >= 20) {
                                checkArraylength.chatLogs.shift();
                            }
                            try {
                                if (hook) hook.send(`⛔ Stopped Bot **${client.user.tag}** @ ${new Date()} 'endTimer has ended'`);
                            } catch (e) {
                                console.log(e.message, 'hook');
                            }
                            checkArraylength.chatLogs.push(`Stopped Bot ${client.user.tag} @ ${new Date()} 'endTimer has ended'`);
                            await dashboardKeys.updateOne({ discordId: discordId }, { $set: { chatLogs: checkArraylength.chatLogs } });

                            await levelFarms.updateOne({ discordId: discordId, botName: client.user.tag }, { state: 0 });
                            await client.destroy();
                            return;
                        }

                        if ((checkIfBotNeedsShutdown.state == 0 || checkIfBotNeedsShutdown.state == 2) && !currentlyShuttingDown) {
                            currentlyShuttingDown = true;
                            console.log('Shutting bot down...', client.user.tag);
                            clearInterval(x);

                            const checkArraylength = await dashboardKeys.findOne({ discordId: discordId });
                            if (checkArraylength.chatLogs.length >= 20) {
                                checkArraylength.chatLogs.shift();
                            }

                            try {
                                if (hook) hook.send(`⛔ Stopped Bot **${client.user.tag}** @ ${new Date()} 'user input'`);
                            } catch (e) {
                                console.log(e.message, 'hook');
                            }
                            checkArraylength.chatLogs.push(`Stopped Bot ${client.user.tag} @ ${new Date()} 'user input'`);
                            await dashboardKeys.updateOne({ discordId: discordId }, { $set: { chatLogs: checkArraylength.chatLogs } });

                            await levelFarms.updateOne({ discordId: discordId, botName: client.user.tag }, { state: 0 });
                            await client.destroy();
                            return;
                        }

                        if (message.author.id == client.user.id) return;
                        if (message.guild.id != mainGuild.id) return;

                        const checkIfBotRunning = checkIfBotNeedsShutdown;

                        if (message.mentions.users.get(client.user.id)) {
                            // if (currentlyChecking) { messagesThatNeedReply.push(message); };
                            if (currentlyChecking) { return; };
                            currentlyChecking = true;
                            try {
                                if (lastResponder == message.author.id) {
                                    totalMessagesWithLastResponder++;
                                }
                                if (totalMessagesWithLastResponder >= 3) {
                                    totalMessagesWithLastResponder = 0;
                                    lastResponder = '';
                                    currentlyChecking = false;
                                    return;
                                }
                                lastResponder = message.author.id;

                                channelIdToCheck = checkIfBotRunning.channelId;
                                await sleep((10000 * Math.random()) + 1000);
                                await axios({
                                    method: 'post',
                                    url: process.env.SERVER_URI + "/api/askRudolph",
                                    data: {
                                        botData: checkIfBotRunning,
                                        text: message.content, // This is the body part
                                        chatLogs: botChatLogs,
                                    }
                                }).then(async function(response) {
                                    answer = response.data.answer;

                                    let answerTrimmed;
                                    if (answer != undefined) {
                                        answerTrimmed = answer.toString().replace(/' '/g, '');
                                    } else {
                                        answerTrimmed = '';
                                    }

                                    if (answer == undefined || answerTrimmed.length <= 0) {
                                        currentlyChecking = false;
                                        return;
                                    } else {
                                        botChatLogs = response.data.chatLogs;
                                        message.channel.startTyping();
                                        await sleep((Math.floor(Math.random() * 2) + 1) * 1000);
                                        await sleep(answer.length * 250);

                                        // message.inlineReply(`${answer}`).catch(error => {
                                        //     console.log(error, 1, answer);
                                        // });

                                        await secretInlinReply(checkIfBotRunning, message, `${answer}`).catch(error => {
                                            serverData.Sentry.captureException(error);
                                            console.log(error, 1, answer);
                                        });

                                        message.channel.stopTyping();
                                    }

                                    let data = checkIfBotRunning.messages;
                                    data.push({ messageAuthor: message.author.tag, message: message.content, response: answer, timeStamp: new Date() });
                                    if (data.length > 20) {
                                        data.shift();
                                    }

                                    await levelFarms.findOneAndUpdate({ discordId: discordId, botName: client.user.tag }, { messages: data });

                                    minutesToAdd = checkIfBotRunning.messageDelay;
                                    currentDate = new Date();
                                    countDownDate = new Date(currentDate.getTime() + (minutesToAdd * 60000)).getTime();
                                    messagesSinceTimer = 0;
                                    setTimeout(() => { currentlyChecking = false }, 1000);
                                });
                            } catch (e) {
                                console.log(e.message);
                                currentlyChecking = false;
                            }
                        } else {

                            try {
                                if (countDownDistance > 0 || currentlyChecking) return;
                                currentlyChecking = true;
                                channelIdToCheck = checkIfBotRunning.channelId;
                                await sleep((10000 * Math.random()) + 1000);

                                if (checkIfBotRunning.spam) {
                                    answer = randomSpam.spam[Math.floor(Math.random() * randomSpam.spam.length)];

                                    while (answer == lastResponse) {
                                        answer = randomSpam.spam[Math.floor(Math.random() * randomSpam.spam.length)];
                                    }

                                    let answerTrimmed;
                                    if (answer != undefined) {
                                        answerTrimmed = answer.toString().replace(/' '/g, '');
                                    } else {
                                        answerTrimmed = '';
                                    }

                                    if (answer == undefined || answerTrimmed.length <= 0) {
                                        currentlyChecking = false;
                                        return;
                                    } else {
                                        if (checkIfBotRunning.delete && lastMessage.length > 0 && !checkIfBotRunning.instantDelete) {
                                            await lastMessage.delete();
                                        }
                                        message.channel.startTyping();
                                        await sleep((Math.floor(Math.random() * 2) + 1) * 1000);
                                        await sleep(answer.length * 250);
                                        message.channel.send(`${answer}`).then(msg => {
                                            lastMessage = msg;
                                            if (checkIfBotRunning.instantDelete) {
                                                msg.delete();
                                            }
                                        }).catch(error => {
                                            serverData.Sentry.captureException(error);
                                            console.log(error, 2, answer);
                                        });
                                        message.channel.stopTyping();
                                    }

                                    let data = checkIfBotRunning.messages;
                                    data.push({ messageAuthor: message.author.tag, message: message.content, response: answer, timeStamp: new Date() });
                                    if (data.length > 20) {
                                        data.shift();
                                    }

                                    await levelFarms.findOneAndUpdate({ discordId: discordId, botName: client.user.tag }, { messages: data });

                                    minutesToAdd = checkIfBotRunning.messageDelay;
                                    currentDate = new Date();
                                    countDownDate = new Date(currentDate.getTime() + (minutesToAdd * 60000)).getTime();
                                    setTimeout(() => { currentlyChecking = false }, 1000);
                                    lastResponse = answer;
                                    messagesSinceTimer = 0;
                                } else {
                                    if (messagesSinceTimer >= 10) {
                                        const greetings = ['Hello!', 'hey', 'sup guys', 'hello', 'hello guys', 'how is everyone doing?', 'what you guys wanna talk about?', 'anyone wanna talk?', 'yo'];
                                        let answer = greetings[Math.floor(Math.random() * greetings.length)];

                                        message.channel.startTyping();
                                        await sleep((Math.floor(Math.random() * 2) + 1) * 1000);
                                        await sleep(answer.length * 250);

                                        message.channel.send(`${answer}`).catch(error => {
                                            serverData.Sentry.captureException(error);
                                            console.log(error, 3, answer);
                                        });

                                        message.channel.stopTyping();

                                        let data = checkIfBotRunning.messages;
                                        data.push({ messageAuthor: 'None', message: 'none', response: answer, timeStamp: new Date() });
                                        if (data.length > 20) {
                                            data.shift();
                                        }

                                        await levelFarms.findOneAndUpdate({ discordId: discordId, botName: client.user.tag }, { messages: data });

                                        minutesToAdd = checkIfBotRunning.messageDelay;
                                        currentDate = new Date();
                                        countDownDate = new Date(currentDate.getTime() + (minutesToAdd * 60000)).getTime();
                                        messagesSinceTimer = 0;
                                        currentlyChecking = false;
                                        return;
                                    }
                                    if ((message.mentions.users.size > 0) && !(message.mentions.users.get(client.user.id))) {
                                        currentlyChecking = false;
                                        messagesSinceTimer += 1;
                                        return;
                                    };

                                    await axios({
                                        method: 'post',
                                        url: process.env.SERVER_URI + "/api/askRudolph",
                                        data: {
                                            botData: checkIfBotRunning,
                                            text: message.content, // This is the body part
                                            chatLogs: botChatLogs
                                        }
                                    }).then(async function(response) {
                                        answer = response.data.answer;

                                        let answerTrimmed;
                                        if (answer != undefined) {
                                            answerTrimmed = answer.toString().replace(/' '/g, '');
                                        } else {
                                            answerTrimmed = '';
                                        }

                                        if (answer == undefined || answerTrimmed.length <= 0) {
                                            currentlyChecking = false;
                                            return;
                                        } else {
                                            message.channel.startTyping();
                                            await sleep((Math.floor(Math.random() * 2) + 1) * 1000);
                                            await sleep(answer.length * 250);
                                            // message.inlineReply(`${answer}`).catch(error => {
                                            //     console.log(error, 3, answer);
                                            // });
                                            await secretInlinReply(checkIfBotRunning, message, `${answer}`).catch(error => {
                                                serverData.Sentry.captureException(error);
                                                console.log(error, 3, answer);
                                            });

                                            message.channel.stopTyping();
                                        }
                                        let data = checkIfBotRunning.messages;
                                        data.push({ messageAuthor: message.author.tag, message: message.content, response: answer, timeStamp: new Date() });
                                        if (data.length > 20) {
                                            data.shift();
                                        }

                                        await levelFarms.findOneAndUpdate({ discordId: discordId, botName: client.user.tag }, { messages: data });

                                        minutesToAdd = checkIfBotRunning.messageDelay;
                                        currentDate = new Date();
                                        countDownDate = new Date(currentDate.getTime() + (minutesToAdd * 60000)).getTime();
                                        messagesSinceTimer = 0;
                                        setTimeout(() => { currentlyChecking = false }, 1000);
                                    });
                                }
                            } catch (e) {
                                console.log(e.message);
                                currentlyChecking = false;
                            }
                        }
                    }
                } catch (e) {
                    serverData.Sentry.captureException(e);
                    console.log(e, client.user.tag);
                    if (currentlyChecking) {
                        currentlyChecking = false;
                    }
                }
            });
        });

        if (req.body.token.iv) {
            client.login(decrypt(req.body.token)).catch(err => {
                res.send({ state: 'error', message: 'Invalid Token Provided!' });
                return;
            });
        } else {
            client.login(req.body.token).catch(err => {
                res.send({ state: 'error', message: 'Invalid Token Provided!' });
                return;
            });
        }
    }
}


// 3|Server   | 2022-02-09 12:49: message_reference: Message inconnu
// 3|Server   | 2022-02-09 12:49:     at RequestHandler.execute (/root/RudolphServerandFrontend/server/node_modules/discord.js-selfbot/src/rest/RequestHandler.js:170:25)
// 3|Server   | 2022-02-09 12:49:     at runMicrotasks (<anonymous>)
// 3|Server   | 2022-02-09 12:49:     at processTicksAndRejections (node:internal/process/task_queues:96:5) {
// 3|Server   | 2022-02-09 12:49:   method: 'post',
// 3|Server   | 2022-02-09 12:49:   path: '/channels/926551031054209057/messages',
// 3|Server   | 2022-02-09 12:49:   code: 50035,
// 3|Server   | 2022-02-09 12:49:   httpStatus: 400
// 3|Server   | 2022-02-09 12:49: } 3


// 3|Server      | 2022-02-09 13:00: DiscordAPIError: Unknown Message
// 3|Server      | 2022-02-09 13:00:     at RequestHandler.execute (/root/RudolphServerandFrontend/server/node_modules/discord.js-selfbot/src/rest/RequestHandler.js:170:25)
// 3|Server      | 2022-02-09 13:00:     at runMicrotasks (<anonymous>)
// 3|Server      | 2022-02-09 13:00:     at processTicksAndRejections (node:internal/process/task_queues:96:5) {
// 3|Server      | 2022-02-09 13:00:   method: 'delete',
// 3|Server      | 2022-02-09 13:00:   path: '/channels/938043300353544254/messages/940955241560571914',
// 3|Server      | 2022-02-09 13:00:   code: 10008,
// 3|Server      | 2022-02-09 13:00:   httpStatus: 404
// 3|Server      | 2022-02-09 13:00: } Cash#1865