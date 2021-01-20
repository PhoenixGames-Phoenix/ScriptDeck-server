const { execute } = require('node-key-sender');
const ks = require('node-key-sender');

module.exports = {
    name: 'simkey_comb',
    async execute(keys) {
        console.log("[simkey_comb] Simulating combination of " + keys);
        keys = await keys.split(",");
        await ks.sendCombination(keys);
    }
}