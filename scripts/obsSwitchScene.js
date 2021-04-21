const obsAPI = require('../plugins/obs-websocket');

module.exports = {
    name: 'obsSwitchScene',
    async execute(scene) {
        await obsAPI.switchScene(scene);
    }
}