
module.exports = {
    name: 'alert',
    async execute(API, message) {
        API.sendMessage(message);
    }
}