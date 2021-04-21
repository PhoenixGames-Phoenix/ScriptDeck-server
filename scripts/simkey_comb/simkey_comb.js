const ks = require('node-key-sender');

module.exports = {
    name: 'simkey_comb',
    async execute(API, keys) {
        console.log("[simkey_comb] Simulating combination of " + keys);
        keys = await keys.split(",");
        await ks.sendCombination(keys);
    }
}