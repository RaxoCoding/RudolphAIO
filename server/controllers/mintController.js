var axios = require('axios');
require('dotenv').config()

exports.mintOne = async function(candyConfig, seed, res, req) {
    var config = {
        method: 'post',
        url: `https://api.theblockchainapi.com/v1/solana/nft/candy_machine/mint?config_address=${candyConfig}&secret_recovery_phrase=${seed}&network=mainnet-beta`,
        headers: {
            'User-Agent': 'admin',
            'APISecretKey': process.env.API_SECRET_KEY,
            'APIKeyID': process.env.API_KEY_ID,
        }
    };

    await axios(config)
        .then(function(response) {
            res.send({ state: 'success', message: 'Minting... (if seedphrase is correct!)' });
            console.log(JSON.stringify(response.data));
        })
        .catch(function(error) {
            res.send({ state: 'error', message: 'ERROR!' });
            console.log(error.message);
            try {
                console.log(error.response.data);
            } catch (e) {}
        });
}

exports.mintMultiple = async function(candyConfig, seed, res, req) {
    var config = {
        method: 'post',
        url: `https://api.theblockchainapi.com/v1/solana/nft/candy_machine/mint?config_address=${candyConfig}&secret_recovery_phrase=${seed}&network=mainnet-beta`,
        headers: {
            'User-Agent': 'admin',
            'APISecretKey': process.env.API_SECRET_KEY,
            'APIKeyID': process.env.API_KEY_ID,
        }
    };

    res.send({ state: 'success', message: 'Minting... (if seedphrase correct!)' });
    for (let i = 0; i < req.body.amountToMint; i++) {
        await axios(config)
            .then(function(response) {
                console.log(JSON.stringify(response.data));
            })
            .catch(function(error) {
                console.log(error.message);
                try {
                    console.log(error.response.data);
                } catch (e) {}
            });
    }
}