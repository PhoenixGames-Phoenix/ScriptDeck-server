const ks = require('node-key-sender');

module.exports = {
    name: 'simkey',
    async execute(API, keys) {
        console.log("[simkey] Simulating " + keys);
        keys = await keys.split(',');
        await ks.sendKeys(keys);
    }
}