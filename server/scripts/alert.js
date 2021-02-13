const { sendMessage } = require('../index');

module.exports = {
    name: 'alert',
    async execute(message) {
        sendMessage(message);
    }
}