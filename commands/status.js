const http = require('http');

exports.run = async(bot, message, args) => {
    var host = 'http://beta.rudolphaio.com';
    http.get(host, function(res) {
        // If you get here, you have a response.
        // If you want, you can check the status code here to verify that it's `200` or some other `2xx`.
        var msg = res.statusCode === 200 ? 'host \`' + host + '\` is alive' : 'host \`' + host + '\` is dead';
        message.channel.send("Status: " + msg);
    }).on('error', function(e) {
        console.log(e);
    });
}

exports.info = {
    name: "status",
    description: "Check RudolphAIO Server Status"
}