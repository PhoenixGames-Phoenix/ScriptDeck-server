const obsAPI = require('../../plugins/obs-websocket');

module.exports = {
    name: 'obsSwitchScene',
    async execute(API, scene) {
        await obsAPI.switchScene(scene);
    }
}